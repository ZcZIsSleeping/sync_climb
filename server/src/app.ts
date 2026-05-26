import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { pool, tx, type DbClient } from './db.js';

type AuthedRequest = express.Request & {
  user?: {
    id: string;
    openid: string;
    nickname: string;
    avatar_url: string;
  };
};

const app = express();

app.use(cors());
app.use(express.json());

const id = (prefix: string) => `${prefix}_${nanoid(12)}`;
const roomCode = () => nanoid(6).toUpperCase().replace(/[-_]/g, 'A');

const dateBody = z.object({
  title: z.string().trim().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

function asyncRoute(handler: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function apiError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

async function requireAuth(req: AuthedRequest, _res: express.Response, next: express.NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(apiError(401, 'missing bearer token'));

  const result = await pool.query(
    'SELECT id, openid, nickname, avatar_url FROM users WHERE session_token = $1',
    [token]
  );
  if (!result.rowCount) return next(apiError(401, 'invalid bearer token'));

  req.user = result.rows[0];
  return next();
}

function userId(req: AuthedRequest) {
  if (!req.user) throw apiError(401, 'unauthorized');
  return req.user.id;
}

function pathParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== 'string' || value.length === 0) throw apiError(400, `missing path param: ${name}`);
  return value;
}

async function getOpenid(code: string) {
  const appid = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;
  if (!appid || !secret) return `local_${code}`;

  const params = new URLSearchParams({
    appid,
    secret,
    js_code: code,
    grant_type: 'authorization_code'
  });
  const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params}`);
  const payload = (await response.json()) as { openid?: string; errmsg?: string };
  if (!payload.openid) throw apiError(502, payload.errmsg ?? 'wechat login failed');
  return payload.openid;
}

async function assertTeamMember(client: DbClient, teamId: string, uid: string) {
  const result = await client.query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2 AND left_at IS NULL',
    [teamId, uid]
  );
  if (!result.rowCount) throw apiError(403, 'not a team member');
  return result.rows[0] as { role: 'owner' | 'member' };
}

async function assertTeamEvent(client: DbClient, teamId: string, eventId: string) {
  const result = await client.query(
    `SELECT * FROM events
     WHERE id = $1 AND team_id = $2 AND scope = 'team' AND deleted_at IS NULL`,
    [eventId, teamId]
  );
  if (!result.rowCount) throw apiError(404, 'team event not found');
  return result.rows[0];
}

function mapEventRow(row: Record<string, unknown>) {
  const dateValue = (value: unknown) => {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return value;
  };

  return {
    id: row.id,
    title: row.title,
    scope: row.scope,
    type: row.type,
    teamId: row.team_id,
    teamName: row.team_name,
    creatorUserId: row.creator_user_id,
    creatorName: row.creator_name,
    memberId: row.member_id,
    memberName: row.member_name,
    status: row.status,
    startDate: dateValue(row.start_date),
    endDate: dateValue(row.end_date)
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/auth/wechat-login', asyncRoute(async (req, res) => {
  const body = z.object({
    code: z.string().trim().min(1),
    nickname: z.string().trim().default('攀登者'),
    avatarUrl: z.string().trim().default('')
  }).parse(req.body);

  const openid = await getOpenid(body.code);
  const token = id('sess');
  const result = await pool.query(
    `INSERT INTO users (id, openid, session_token, nickname, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (openid) DO UPDATE
       SET session_token = EXCLUDED.session_token,
           nickname = EXCLUDED.nickname,
           avatar_url = EXCLUDED.avatar_url,
           updated_at = now()
     RETURNING id, nickname, avatar_url`,
    [id('usr'), openid, token, body.nickname, body.avatarUrl]
  );

  res.json({
    token,
    user: {
      id: result.rows[0].id,
      nickname: result.rows[0].nickname,
      avatarUrl: result.rows[0].avatar_url
    }
  });
}));

app.use('/gear-types', requireAuth);
app.get('/gear-types', asyncRoute(async (_req, res) => {
  const result = await pool.query(
    'SELECT id, name, icon_key AS "iconKey", is_system AS "isSystem" FROM gear_types ORDER BY is_system DESC, created_at ASC'
  );
  res.json({ gearTypes: result.rows });
}));

app.post('/gear-types', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({
    name: z.string().trim().min(1),
    iconKey: z.string().trim().min(1).max(8)
  }).parse(req.body);

  const result = await pool.query(
    `INSERT INTO gear_types (id, name, icon_key, created_by_user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, icon_key AS "iconKey", is_system AS "isSystem"`,
    [id('gear'), body.name, body.iconKey, userId(req)]
  );
  res.status(201).json({ gearType: result.rows[0] });
}));

app.use('/me', requireAuth);
app.patch('/me/profile', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ nickname: z.string().trim().min(1) }).parse(req.body);
  const result = await pool.query(
    `UPDATE users SET nickname = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, nickname, avatar_url AS "avatarUrl"`,
    [body.nickname, userId(req)]
  );
  res.json({ user: result.rows[0] });
}));

app.get('/me/gears', asyncRoute(async (req: AuthedRequest, res) => {
  const result = await pool.query(
    `SELECT ug.id, ug.gear_type_id AS "gearTypeId", gt.icon_key AS "iconKey", ug.name, ug.quantity
     FROM user_gears ug
     JOIN gear_types gt ON gt.id = ug.gear_type_id
     WHERE ug.user_id = $1
     ORDER BY ug.created_at DESC`,
    [userId(req)]
  );
  res.json({ gears: result.rows });
}));

app.post('/me/gears', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({
    gearTypeId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    quantity: z.number().int().min(0).default(1)
  }).parse(req.body);

  const result = await pool.query(
    `INSERT INTO user_gears (id, user_id, gear_type_id, name, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, gear_type_id AS "gearTypeId", name, quantity`,
    [id('ug'), userId(req), body.gearTypeId, body.name, body.quantity]
  );
  res.status(201).json({ gear: result.rows[0] });
}));

app.patch('/me/gears/:gearId', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({
    name: z.string().trim().min(1).optional(),
    quantity: z.number().int().min(0).optional()
  }).parse(req.body);
  if (body.name === undefined && body.quantity === undefined) throw apiError(400, 'nothing to update');

  const result = await pool.query(
    `UPDATE user_gears
     SET name = COALESCE($1, name), quantity = COALESCE($2, quantity), updated_at = now()
     WHERE id = $3 AND user_id = $4
     RETURNING id, gear_type_id AS "gearTypeId", name, quantity`,
    [body.name, body.quantity, req.params.gearId, userId(req)]
  );
  if (!result.rowCount) throw apiError(404, 'gear not found');
  res.json({ gear: result.rows[0] });
}));

app.delete('/me/gears/:gearId', asyncRoute(async (req: AuthedRequest, res) => {
  const result = await pool.query('DELETE FROM user_gears WHERE id = $1 AND user_id = $2', [
    req.params.gearId,
    userId(req)
  ]);
  if (!result.rowCount) throw apiError(404, 'gear not found');
  res.status(204).end();
}));

app.get('/me/calendar/events', asyncRoute(async (req: AuthedRequest, res) => {
  const query = z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).parse(req.query);

  const result = await pool.query(
    `SELECT e.*,
            CASE
              WHEN e.scope = 'personal' THEN 'personal'
              WHEN ep.status = 'pending' THEN 'pending_team'
              ELSE 'team'
            END AS type,
            ep.status,
            t.name AS team_name,
            u.nickname AS creator_name
     FROM events e
     JOIN event_participants ep ON ep.event_id = e.id AND ep.user_id = $1
     LEFT JOIN teams t ON t.id = e.team_id
     JOIN users u ON u.id = e.creator_user_id
     WHERE e.deleted_at IS NULL
       AND e.start_date <= $3
       AND e.end_date >= $2
       AND ep.status IN ('pending', 'joined')
     ORDER BY e.start_date ASC, e.end_date DESC`,
    [userId(req), query.start, query.end]
  );
  res.json({ events: result.rows.map(mapEventRow) });
}));

app.post('/me/events', asyncRoute(async (req: AuthedRequest, res) => {
  const body = dateBody.parse(req.body);
  const uid = userId(req);

  const event = await tx(async (client) => {
    const eventResult = await client.query(
      `INSERT INTO events (id, title, creator_user_id, scope, start_date, end_date)
       VALUES ($1, $2, $3, 'personal', $4, $5)
       RETURNING *`,
      [id('evt'), body.title, uid, body.startDate, body.endDate]
    );
    await client.query(
      `INSERT INTO event_participants (id, event_id, user_id, status, source)
       VALUES ($1, $2, $3, 'joined', 'creator')`,
      [id('ep'), eventResult.rows[0].id, uid]
    );
    return eventResult.rows[0];
  });
  res.status(201).json({ event: mapEventRow({ ...event, type: 'personal' }) });
}));

app.patch('/me/events/:eventId', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ title: z.string().trim().min(1) }).parse(req.body);
  const result = await pool.query(
    `UPDATE events
     SET title = $1, updated_at = now()
     WHERE id = $2 AND creator_user_id = $3 AND scope = 'personal' AND deleted_at IS NULL
     RETURNING *`,
    [body.title, req.params.eventId, userId(req)]
  );
  if (!result.rowCount) throw apiError(404, 'personal event not found');
  res.json({ event: mapEventRow({ ...result.rows[0], type: 'personal' }) });
}));

app.patch('/me/events/:eventId/move', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
  const result = await pool.query(
    `UPDATE events
     SET start_date = $1::date,
         end_date = ($1::date + (end_date - start_date)),
         updated_at = now()
     WHERE id = $2 AND creator_user_id = $3 AND scope = 'personal' AND deleted_at IS NULL
     RETURNING *`,
    [body.startDate, req.params.eventId, userId(req)]
  );
  if (!result.rowCount) throw apiError(404, 'personal event not found');
  res.json({ event: mapEventRow({ ...result.rows[0], type: 'personal' }) });
}));

app.delete('/me/events/:eventId', asyncRoute(async (req: AuthedRequest, res) => {
  const result = await pool.query(
    `UPDATE events SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND creator_user_id = $2 AND scope = 'personal' AND deleted_at IS NULL`,
    [req.params.eventId, userId(req)]
  );
  if (!result.rowCount) throw apiError(404, 'personal event not found');
  res.status(204).end();
}));

app.post('/me/events/:eventId/accept', asyncRoute(async (req: AuthedRequest, res) => {
  const result = await pool.query(
    `UPDATE event_participants ep
     SET status = 'joined', updated_at = now()
     FROM events e
     WHERE ep.event_id = e.id AND ep.event_id = $1 AND ep.user_id = $2
       AND e.scope = 'team' AND e.deleted_at IS NULL
       AND ep.status IN ('pending', 'rejected', 'left')
     RETURNING ep.*`,
    [req.params.eventId, userId(req)]
  );
  if (!result.rowCount) throw apiError(404, 'team event invite not found');
  res.json({ participant: result.rows[0] });
}));

app.post('/me/events/:eventId/reject', asyncRoute(async (req: AuthedRequest, res) => {
  const result = await pool.query(
    `UPDATE event_participants ep
     SET status = 'rejected', updated_at = now()
     FROM events e
     WHERE ep.event_id = e.id AND ep.event_id = $1 AND ep.user_id = $2
       AND e.scope = 'team' AND e.deleted_at IS NULL
       AND ep.status = 'pending'
     RETURNING ep.*`,
    [req.params.eventId, userId(req)]
  );
  if (!result.rowCount) throw apiError(404, 'pending team event not found');
  res.json({ participant: result.rows[0] });
}));

app.use('/teams', requireAuth);
app.get('/teams', asyncRoute(async (req: AuthedRequest, res) => {
  const result = await pool.query(
    `SELECT t.id, t.name, t.avatar_url AS "avatarUrl", t.room_code AS "roomCode",
            tm.role,
            (SELECT count(*)::int FROM team_members active WHERE active.team_id = t.id AND active.left_at IS NULL) AS "memberCount"
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1 AND tm.left_at IS NULL
     ORDER BY tm.joined_at DESC`,
    [userId(req)]
  );
  res.json({ teams: result.rows });
}));

app.post('/teams', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ name: z.string().trim().min(1) }).parse(req.body);
  const uid = userId(req);
  const team = await tx(async (client) => {
    const teamResult = await client.query(
      `INSERT INTO teams (id, name, room_code, owner_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, avatar_url AS "avatarUrl", room_code AS "roomCode", owner_user_id AS "ownerUserId"`,
      [id('team'), body.name, roomCode(), uid]
    );
    await client.query(
      `INSERT INTO team_members (id, team_id, user_id, role)
       VALUES ($1, $2, $3, 'owner')`,
      [id('tm'), teamResult.rows[0].id, uid]
    );
    return teamResult.rows[0];
  });
  res.status(201).json({ team });
}));

app.post('/teams/join', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ roomCode: z.string().trim().min(1) }).parse(req.body);
  const uid = userId(req);
  const result = await tx(async (client) => {
    const teamResult = await client.query('SELECT id, name, room_code AS "roomCode" FROM teams WHERE room_code = $1', [
      body.roomCode
    ]);
    if (!teamResult.rowCount) throw apiError(404, 'team not found');
    await client.query(
      `INSERT INTO team_members (id, team_id, user_id, role)
       VALUES ($1, $2, $3, 'member')
       ON CONFLICT (team_id, user_id) DO UPDATE
         SET left_at = NULL, joined_at = now()`,
      [id('tm'), teamResult.rows[0].id, uid]
    );
    return teamResult.rows[0];
  });
  res.json({ team: result });
}));

app.delete('/teams/:teamId/leave', asyncRoute(async (req: AuthedRequest, res) => {
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  await tx(async (client) => {
    await assertTeamMember(client, teamId, uid);
    await client.query(
      'UPDATE team_members SET left_at = now() WHERE team_id = $1 AND user_id = $2 AND left_at IS NULL',
      [teamId, uid]
    );
    await client.query(
      `UPDATE event_participants ep
       SET status = 'left', updated_at = now()
       FROM events e
       WHERE ep.event_id = e.id AND e.team_id = $1 AND ep.user_id = $2 AND e.deleted_at IS NULL`,
      [teamId, uid]
    );
  });
  res.status(204).end();
}));

app.patch('/teams/:teamId', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ name: z.string().trim().min(1) }).parse(req.body);
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  await assertTeamMember(pool, teamId, uid);
  const result = await pool.query(
    `UPDATE teams SET name = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, name, avatar_url AS "avatarUrl", room_code AS "roomCode"`,
    [body.name, teamId]
  );
  if (!result.rowCount) throw apiError(404, 'team not found');
  res.json({ team: result.rows[0] });
}));

app.get('/teams/:teamId/members', asyncRoute(async (req: AuthedRequest, res) => {
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  await assertTeamMember(pool, teamId, uid);

  const members = await pool.query(
    `SELECT u.id, u.nickname AS name, u.avatar_url AS "avatarUrl", tm.role
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1 AND tm.left_at IS NULL
     ORDER BY tm.joined_at ASC`,
    [teamId]
  );
  const gears = await pool.query(
    `SELECT ug.user_id AS "userId", ug.id, ug.name, ug.quantity AS count, gt.icon_key AS icon, ug.gear_type_id AS "gearTypeId"
     FROM user_gears ug
     JOIN gear_types gt ON gt.id = ug.gear_type_id
     JOIN team_members tm ON tm.user_id = ug.user_id
     WHERE tm.team_id = $1 AND tm.left_at IS NULL
     ORDER BY ug.created_at DESC`,
    [teamId]
  );
  const gearByUser = new Map<string, unknown[]>();
  gears.rows.forEach((gear) => {
    const list = gearByUser.get(gear.userId) ?? [];
    list.push(gear);
    gearByUser.set(gear.userId, list);
  });

  res.json({
    members: members.rows.map((member, index) => ({
      ...member,
      avatar: member.name.slice(0, 1).toUpperCase(),
      colorIndex: index,
      gear: gearByUser.get(member.id) ?? []
    }))
  });
}));

app.get('/teams/:teamId/calendar/events', asyncRoute(async (req: AuthedRequest, res) => {
  const query = z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    onlyTeamEvents: z.enum(['true', 'false']).default('false')
  }).parse(req.query);
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  await assertTeamMember(pool, teamId, uid);

  const teamEvents = await pool.query(
    `SELECT e.*, 'team' AS type, ep.status, u.nickname AS creator_name
     FROM events e
     JOIN users u ON u.id = e.creator_user_id
     LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.user_id = $4
     WHERE e.team_id = $1 AND e.scope = 'team' AND e.deleted_at IS NULL
       AND e.start_date <= $3 AND e.end_date >= $2
     ORDER BY e.start_date ASC`,
    [teamId, query.start, query.end, uid]
  );

  if (query.onlyTeamEvents === 'true') {
    res.json({ events: teamEvents.rows.map(mapEventRow) });
    return;
  }

  const personalEvents = await pool.query(
    `SELECT e.*, 'member_personal' AS type, tm.user_id AS member_id, u.nickname AS member_name
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     JOIN events e ON e.creator_user_id = tm.user_id AND e.scope = 'personal'
     WHERE tm.team_id = $1 AND tm.left_at IS NULL AND e.deleted_at IS NULL
       AND e.start_date <= $3 AND e.end_date >= $2
     ORDER BY e.start_date ASC`,
    [teamId, query.start, query.end]
  );

  res.json({ events: [...personalEvents.rows, ...teamEvents.rows].map(mapEventRow) });
}));

app.post('/teams/:teamId/events', asyncRoute(async (req: AuthedRequest, res) => {
  const body = dateBody.extend({
    participantUserIds: z.array(z.string()).default([])
  }).parse(req.body);
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const event = await tx(async (client) => {
    await assertTeamMember(client, teamId, uid);
    const eventResult = await client.query(
      `INSERT INTO events (id, title, creator_user_id, scope, team_id, start_date, end_date)
       VALUES ($1, $2, $3, 'team', $4, $5, $6)
       RETURNING *`,
      [id('evt'), body.title, uid, teamId, body.startDate, body.endDate]
    );
    const eventId = eventResult.rows[0].id;
    const participants = Array.from(new Set([uid, ...body.participantUserIds]));
    for (const participantId of participants) {
      await assertTeamMember(client, teamId, participantId);
      await client.query(
        `INSERT INTO event_participants (id, event_id, user_id, team_id, status, source)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id('ep'),
          eventId,
          participantId,
          teamId,
          participantId === uid ? 'joined' : 'pending',
          participantId === uid ? 'creator' : 'invited'
        ]
      );
    }
    return eventResult.rows[0];
  });
  res.status(201).json({ event: mapEventRow({ ...event, type: 'team', status: 'joined' }) });
}));

app.get('/teams/:teamId/events/:eventId', asyncRoute(async (req: AuthedRequest, res) => {
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');
  await assertTeamMember(pool, teamId, uid);
  const event = await assertTeamEvent(pool, teamId, eventId);

  const participants = await pool.query(
    `SELECT u.id AS "userId", u.nickname, u.avatar_url AS "avatarUrl", ep.status
     FROM event_participants ep
     JOIN users u ON u.id = ep.user_id
     WHERE ep.event_id = $1 AND ep.status = 'joined'
     ORDER BY ep.created_at ASC`,
    [eventId]
  );
  const requirements = await pool.query(
    `SELECT egr.participant_user_id AS "participantUserId",
            egr.gear_type_id AS "gearTypeId",
            gt.name,
            gt.icon_key AS "iconKey",
            egr.quantity
     FROM event_gear_requirements egr
     JOIN gear_types gt ON gt.id = egr.gear_type_id
     WHERE egr.event_id = $1 AND egr.quantity > 0`,
    [eventId]
  );
  const summary = await pool.query(
    `SELECT egr.gear_type_id AS "gearTypeId", gt.name, gt.icon_key AS "iconKey", sum(egr.quantity)::int AS quantity
     FROM event_gear_requirements egr
     JOIN gear_types gt ON gt.id = egr.gear_type_id
     WHERE egr.event_id = $1 AND egr.quantity > 0
     GROUP BY egr.gear_type_id, gt.name, gt.icon_key
     ORDER BY gt.name ASC`,
    [eventId]
  );
  const myStatus = await pool.query('SELECT status FROM event_participants WHERE event_id = $1 AND user_id = $2', [eventId, uid]);

  res.json({
    event: mapEventRow({ ...event, type: 'team', status: myStatus.rows[0]?.status ?? null }),
    participants: participants.rows,
    requirements: requirements.rows,
    gearSummary: summary.rows
  });
}));

app.post('/teams/:teamId/events/:eventId/join', asyncRoute(async (req: AuthedRequest, res) => {
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');
  const participant = await tx(async (client) => {
    await assertTeamMember(client, teamId, uid);
    await assertTeamEvent(client, teamId, eventId);
    const result = await client.query(
      `INSERT INTO event_participants (id, event_id, user_id, team_id, status, source)
       VALUES ($1, $2, $3, $4, 'joined', 'self_joined')
       ON CONFLICT (event_id, user_id) DO UPDATE
         SET status = 'joined', updated_at = now()
       RETURNING *`,
      [id('ep'), eventId, uid, teamId]
    );
    return result.rows[0];
  });
  res.json({ participant });
}));

app.post('/teams/:teamId/events/:eventId/leave', asyncRoute(async (req: AuthedRequest, res) => {
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');
  const result = await pool.query(
    `UPDATE event_participants
     SET status = 'left', updated_at = now()
     WHERE event_id = $1 AND user_id = $2 AND team_id = $3
     RETURNING *`,
    [eventId, userId(req), teamId]
  );
  if (!result.rowCount) throw apiError(404, 'participant not found');
  res.json({ participant: result.rows[0] });
}));

app.patch('/teams/:teamId/events/:eventId', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ title: z.string().trim().min(1) }).parse(req.body);
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');
  await assertTeamMember(pool, teamId, uid);
  const result = await pool.query(
    `UPDATE events
     SET title = $1, updated_at = now()
     WHERE id = $2 AND team_id = $3 AND creator_user_id = $4 AND scope = 'team' AND deleted_at IS NULL
     RETURNING *`,
    [body.title, eventId, teamId, uid]
  );
  if (!result.rowCount) throw apiError(404, 'editable team event not found');
  res.json({ event: mapEventRow({ ...result.rows[0], type: 'team' }) });
}));

app.patch('/teams/:teamId/events/:eventId/move', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');
  await assertTeamMember(pool, teamId, uid);
  const result = await pool.query(
    `UPDATE events
     SET start_date = $1::date,
         end_date = ($1::date + (end_date - start_date)),
         updated_at = now()
     WHERE id = $2 AND team_id = $3 AND creator_user_id = $4 AND scope = 'team' AND deleted_at IS NULL
     RETURNING *`,
    [body.startDate, eventId, teamId, uid]
  );
  if (!result.rowCount) throw apiError(404, 'movable team event not found');
  res.json({ event: mapEventRow({ ...result.rows[0], type: 'team' }) });
}));

app.delete('/teams/:teamId/events/:eventId', asyncRoute(async (req: AuthedRequest, res) => {
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');
  await assertTeamMember(pool, teamId, uid);
  const result = await pool.query(
    `UPDATE events SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND team_id = $2 AND creator_user_id = $3 AND scope = 'team' AND deleted_at IS NULL`,
    [eventId, teamId, uid]
  );
  if (!result.rowCount) throw apiError(404, 'deletable team event not found');
  res.status(204).end();
}));

app.patch('/teams/:teamId/events/:eventId/gear-requirements', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({
    requirements: z.array(z.object({
      participantUserId: z.string().trim().min(1),
      gearTypeId: z.string().trim().min(1),
      quantity: z.number().int().min(0)
    }))
  }).parse(req.body);
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');

  const summary = await tx(async (client) => {
    const event = await assertTeamEvent(client, teamId, eventId);
    if (event.creator_user_id !== uid) throw apiError(403, 'only event creator can assign gear');

    for (const item of body.requirements) {
      const participant = await client.query(
        `SELECT 1 FROM event_participants
         WHERE event_id = $1 AND user_id = $2 AND status = 'joined'`,
        [eventId, item.participantUserId]
      );
      if (!participant.rowCount) throw apiError(400, 'participant must be joined');

      const owned = await client.query(
        `SELECT COALESCE(sum(quantity), 0)::int AS quantity
         FROM user_gears
         WHERE user_id = $1 AND gear_type_id = $2`,
        [item.participantUserId, item.gearTypeId]
      );
      if (item.quantity > owned.rows[0].quantity) throw apiError(400, 'quantity exceeds owned gear');

      await client.query(
        `INSERT INTO event_gear_requirements
           (id, event_id, participant_user_id, gear_type_id, quantity, assigned_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (event_id, participant_user_id, gear_type_id) DO UPDATE
           SET quantity = EXCLUDED.quantity,
               assigned_by_user_id = EXCLUDED.assigned_by_user_id,
               updated_at = now()`,
        [id('egr'), eventId, item.participantUserId, item.gearTypeId, item.quantity, uid]
      );
    }

    const result = await client.query(
      `SELECT egr.gear_type_id AS "gearTypeId", gt.name, gt.icon_key AS "iconKey", sum(egr.quantity)::int AS quantity
       FROM event_gear_requirements egr
       JOIN gear_types gt ON gt.id = egr.gear_type_id
       WHERE egr.event_id = $1 AND egr.quantity > 0
       GROUP BY egr.gear_type_id, gt.name, gt.icon_key
       ORDER BY gt.name ASC`,
      [eventId]
    );
    return result.rows;
  });

  res.json({ gearSummary: summary });
}));

app.use((error: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'validation_error', details: error.issues });
    return;
  }
  const status = error.status ?? 500;
  res.status(status).json({ error: error.message });
});

export {
  apiError,
  app,
  assertTeamEvent,
  assertTeamMember,
  getOpenid,
  mapEventRow,
  pathParam
};
