import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { pool, tx, type DbClient } from './db.js';

type AuthedRequest = express.Request & {
  traceId?: string;
  user?: {
    id: string;
    openid: string;
    nickname: string;
    avatar_url: string;
  };
};

const app = express();
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use((req: AuthedRequest, res, next) => {
  const traceId = `trc_${nanoid(12)}`;
  const startedAt = Date.now();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  res.on('finish', () => {
    console.info(JSON.stringify({
      level: 'info',
      traceId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id
    }));
  });
  next();
});

const id = (prefix: string) => `${prefix}_${nanoid(12)}`;
const roomCode = () => nanoid(6).toUpperCase().replace(/[-_]/g, 'A');
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).default('');
const idText = z.string().trim().min(1).max(64);
const authCode = text(128);
const avatarUrl = optionalText(512);
const nickname = text(20);
const eventTitle = text(50);
const teamName = text(30);
const gearName = text(30);
const iconKey = text(8);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const roomCodeInput = z.string().trim().length(6).transform((value) => value.toUpperCase());

const dateBody = z.object({
  title: eventTitle,
  startDate: dateString,
  endDate: dateString
});

function asyncRoute(handler: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function apiError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? path.join(serverRoot, 'uploads'));
const avatarUploadDir = path.join(uploadRoot, 'avatars');
const avatarMimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(avatarUploadDir, { recursive: true }, (error) => callback(error, avatarUploadDir));
    },
    filename: (req, file, callback) => {
      const extension = avatarMimeExtensions[file.mimetype] ?? 'jpg';
      const uid = (req as AuthedRequest).user?.id ?? 'unknown';
      callback(null, `${uid}_${Date.now()}_${nanoid(8)}.${extension}`);
    }
  }),
  limits: {
    fileSize: 4 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!avatarMimeExtensions[file.mimetype]) {
      callback(apiError(400, 'unsupported avatar type'));
      return;
    }
    callback(null, true);
  }
});

app.use('/uploads', express.static(uploadRoot, {
  immutable: true,
  maxAge: '30d'
}));

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
  const parsed = idText.safeParse(value);
  if (!parsed.success) throw apiError(400, `invalid path param: ${name}`);
  return parsed.data;
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

function errorCodeForStatus(status: number) {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  return 'INTERNAL_ERROR';
}

function errorMessageForStatus(status: number) {
  if (status === 400) return '请求无法处理';
  if (status === 401) return '请先登录';
  if (status === 403) return '没有操作权限';
  if (status === 404) return '资源不存在';
  if (status === 409) return '资源状态冲突';
  return '服务暂时不可用';
}

function logError(error: Error & { status?: number }, req: AuthedRequest, status: number, validationIssues?: unknown) {
  console.error(JSON.stringify({
    level: 'error',
    traceId: req.traceId,
    status,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
    validationIssues,
    timestamp: new Date().toISOString()
  }));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/auth/wechat-login', asyncRoute(async (req, res) => {
  const body = z.object({
    code: authCode,
    nickname: nickname.default('攀登者'),
    avatarUrl
  }).parse(req.body);

  const openid = await getOpenid(body.code);
  const token = id('sess');
  const result = await pool.query(
    `INSERT INTO users (id, openid, session_token, nickname, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (openid) DO UPDATE
       SET session_token = EXCLUDED.session_token,
           avatar_url = COALESCE(NULLIF(users.avatar_url, ''), EXCLUDED.avatar_url),
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
    name: gearName,
    iconKey
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
  const body = z.object({
    nickname,
    avatarUrl: avatarUrl.optional()
  }).parse(req.body);
  const result = await pool.query(
    `UPDATE users
     SET nickname = $1,
         avatar_url = COALESCE(NULLIF($2, ''), avatar_url),
         updated_at = now()
     WHERE id = $3
     RETURNING id, nickname, avatar_url AS "avatarUrl"`,
    [body.nickname, body.avatarUrl ?? null, userId(req)]
  );
  res.json({ user: result.rows[0] });
}));

app.post('/me/avatar', avatarUpload.single('avatar'), asyncRoute(async (req: AuthedRequest, res) => {
  if (!req.file) throw apiError(400, 'avatar file is required');

  const publicBaseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  const storedAvatarUrl = `${publicBaseUrl}${avatarPath}`;
  const result = await pool.query(
    `UPDATE users SET avatar_url = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, nickname, avatar_url AS "avatarUrl"`,
    [storedAvatarUrl, userId(req)]
  );

  res.status(201).json({
    avatarUrl: storedAvatarUrl,
    user: result.rows[0]
  });
}));

app.get('/me/gears', asyncRoute(async (req: AuthedRequest, res) => {
  const result = await pool.query(
    `SELECT ug.id, ug.gear_type_id AS "gearTypeId", gt.icon_key AS "iconKey", ug.name, ug.quantity,
            ug.display_order AS "displayOrder"
     FROM user_gears ug
     JOIN gear_types gt ON gt.id = ug.gear_type_id
     WHERE ug.user_id = $1
     ORDER BY ug.display_order ASC, ug.created_at DESC`,
    [userId(req)]
  );
  res.json({ gears: result.rows });
}));

app.post('/me/gears', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({
    gearTypeId: idText,
    name: gearName,
    quantity: z.number().int().min(0).default(1)
  }).parse(req.body);

  const result = await pool.query(
    `INSERT INTO user_gears (id, user_id, gear_type_id, name, quantity, display_order)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       COALESCE((SELECT min(display_order) - 1000 FROM user_gears WHERE user_id = $2), 0)
     )
     RETURNING id, gear_type_id AS "gearTypeId", name, quantity, display_order AS "displayOrder"`,
    [id('ug'), userId(req), body.gearTypeId, body.name, body.quantity]
  );
  res.status(201).json({ gear: result.rows[0] });
}));

app.patch('/me/gears/order', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({
    gearIds: z.array(idText).min(1).max(200)
  }).parse(req.body);
  const uniqueIds = Array.from(new Set(body.gearIds));
  if (uniqueIds.length !== body.gearIds.length) throw apiError(400, 'duplicate gear ids');

  const uid = userId(req);
  await tx(async (client) => {
    const owned = await client.query('SELECT id FROM user_gears WHERE user_id = $1', [uid]);
    const ownedIds = new Set(owned.rows.map((item) => item.id as string));
    if (ownedIds.size !== uniqueIds.length || uniqueIds.some((gearId) => !ownedIds.has(gearId))) {
      throw apiError(400, 'gear order must include all owned gears');
    }

    const values = uniqueIds.map((gearId, index) => `($${index * 2 + 1}, $${index * 2 + 2}::integer)`).join(', ');
    const params = uniqueIds.flatMap((gearId, index) => [gearId, (index + 1) * 1000]);
    await client.query(
      `UPDATE user_gears
       SET display_order = ordered.display_order,
           updated_at = now()
       FROM (VALUES ${values}) AS ordered(id, display_order)
       WHERE user_gears.id = ordered.id
         AND user_gears.user_id = $${params.length + 1}`,
      [...params, uid]
    );
  });

  res.json({ ok: true });
}));

app.patch('/me/gears/:gearId', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({
    name: gearName.optional(),
    quantity: z.number().int().min(0).optional()
  }).parse(req.body);
  if (body.name === undefined && body.quantity === undefined) throw apiError(400, 'nothing to update');

  const result = await pool.query(
    `UPDATE user_gears
     SET name = COALESCE($1, name), quantity = COALESCE($2, quantity), updated_at = now()
     WHERE id = $3 AND user_id = $4
     RETURNING id, gear_type_id AS "gearTypeId", name, quantity, display_order AS "displayOrder"`,
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
    start: dateString,
    end: dateString
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
  const body = z.object({ title: eventTitle }).parse(req.body);
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
  const body = z.object({ startDate: dateString }).parse(req.body);
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
  const body = z.object({ name: teamName }).parse(req.body);
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
  const body = z.object({ roomCode: roomCodeInput }).parse(req.body);
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
  const body = z.object({ name: teamName }).parse(req.body);
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
    `SELECT ug.user_id AS "userId", ug.id, ug.name, ug.quantity AS count, gt.icon_key AS icon,
            ug.gear_type_id AS "gearTypeId", ug.display_order AS "displayOrder"
     FROM user_gears ug
     JOIN gear_types gt ON gt.id = ug.gear_type_id
     JOIN team_members tm ON tm.user_id = ug.user_id
     WHERE tm.team_id = $1 AND tm.left_at IS NULL
     ORDER BY ug.display_order ASC, ug.created_at DESC`,
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
    start: dateString,
    end: dateString,
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
    participantUserIds: z.array(idText).default([])
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
            egr.user_gear_id AS "userGearId",
            ug.name,
            gt.name AS "typeName",
            gt.icon_key AS "iconKey",
            egr.quantity
     FROM event_gear_requirements egr
     JOIN event_participants ep ON ep.event_id = egr.event_id
       AND ep.user_id = egr.participant_user_id
       AND ep.status = 'joined'
     JOIN gear_types gt ON gt.id = egr.gear_type_id
     JOIN user_gears ug ON ug.id = egr.user_gear_id
     WHERE egr.event_id = $1 AND egr.quantity > 0
     ORDER BY egr.created_at ASC`,
    [eventId]
  );
  const summary = await pool.query(
    `SELECT egr.gear_type_id AS "gearTypeId", gt.name, gt.icon_key AS "iconKey", sum(egr.quantity)::int AS quantity
     FROM event_gear_requirements egr
     JOIN event_participants ep ON ep.event_id = egr.event_id
       AND ep.user_id = egr.participant_user_id
       AND ep.status = 'joined'
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
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');
  const participant = await tx(async (client) => {
    await assertTeamMember(client, teamId, uid);
    const event = await assertTeamEvent(client, teamId, eventId);
    if (event.creator_user_id === uid) throw apiError(400, 'creator cannot leave own event');
    const result = await client.query(
      `UPDATE event_participants
       SET status = 'left', updated_at = now()
       WHERE event_id = $1 AND user_id = $2 AND team_id = $3 AND status = 'joined'
       RETURNING *`,
      [eventId, uid, teamId]
    );
    if (!result.rowCount) throw apiError(404, 'participant not found');
    await client.query(
      `DELETE FROM event_gear_requirements
       WHERE event_id = $1 AND participant_user_id = $2`,
      [eventId, uid]
    );
    return result.rows[0];
  });
  res.json({ participant });
}));

app.patch('/teams/:teamId/events/:eventId', asyncRoute(async (req: AuthedRequest, res) => {
  const body = z.object({ title: eventTitle }).parse(req.body);
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
  const body = z.object({ startDate: dateString }).parse(req.body);
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
      participantUserId: idText,
      gearTypeId: idText,
      userGearId: idText,
      quantity: z.number().int().min(0)
    }))
  }).parse(req.body);
  const uid = userId(req);
  const teamId = pathParam(req.params.teamId, 'teamId');
  const eventId = pathParam(req.params.eventId, 'eventId');

  const summary = await tx(async (client) => {
    const event = await assertTeamEvent(client, teamId, eventId);
    if (event.creator_user_id !== uid) throw apiError(403, 'only event creator can assign gear');

    if (body.requirements.length) {
      const participantIds = Array.from(new Set(body.requirements.map((item) => item.participantUserId)));
      const participants = await client.query(
        `SELECT user_id
         FROM event_participants
         WHERE event_id = $1 AND status = 'joined' AND user_id = ANY($2::text[])`,
        [eventId, participantIds]
      );
      const joined = new Set(participants.rows.map((item) => item.user_id as string));
      if (participantIds.some((participantId) => !joined.has(participantId))) {
        throw apiError(400, 'participant must be joined');
      }

      const gearIds = Array.from(new Set(body.requirements.map((item) => item.userGearId)));
      const owned = await client.query(
        `SELECT id, user_id, gear_type_id, quantity
         FROM user_gears
         WHERE id = ANY($1::text[])`,
        [gearIds]
      );
      const ownedById = new Map(owned.rows.map((item) => [item.id as string, item]));
      for (const item of body.requirements) {
        const gear = ownedById.get(item.userGearId);
        if (!gear || gear.user_id !== item.participantUserId || gear.gear_type_id !== item.gearTypeId) {
          throw apiError(400, 'owned gear not found');
        }
        if (item.quantity > gear.quantity) throw apiError(400, 'quantity exceeds owned gear');
      }

      const deletes = body.requirements.filter((item) => item.quantity === 0);
      if (deletes.length) {
        const deleteValues = deletes.map((_, index) => `($${index * 2 + 2}, $${index * 2 + 3})`).join(', ');
        const deleteParams = deletes.flatMap((item) => [item.participantUserId, item.userGearId]);
        await client.query(
          `DELETE FROM event_gear_requirements egr
           USING (VALUES ${deleteValues}) AS deleted(participant_user_id, user_gear_id)
           WHERE egr.event_id = $1
             AND egr.participant_user_id = deleted.participant_user_id
             AND egr.user_gear_id = deleted.user_gear_id`,
          [eventId, ...deleteParams]
        );
      }

      const upserts = body.requirements.filter((item) => item.quantity > 0);
      if (upserts.length) {
        const upsertValues = upserts.map((_, index) => {
          const base = index * 7 + 1;
          return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
        }).join(', ');
        const upsertParams = upserts.flatMap((item) => [
          id('egr'),
          eventId,
          item.participantUserId,
          item.gearTypeId,
          item.userGearId,
          item.quantity,
          uid
        ]);
        await client.query(
          `INSERT INTO event_gear_requirements
             (id, event_id, participant_user_id, gear_type_id, user_gear_id, quantity, assigned_by_user_id)
           VALUES ${upsertValues}
           ON CONFLICT (event_id, participant_user_id, user_gear_id) DO UPDATE
             SET quantity = EXCLUDED.quantity,
                 gear_type_id = EXCLUDED.gear_type_id,
                 assigned_by_user_id = EXCLUDED.assigned_by_user_id,
                 updated_at = now()`,
          upsertParams
        );
      }
    }

    const result = await client.query(
      `SELECT egr.gear_type_id AS "gearTypeId", gt.name, gt.icon_key AS "iconKey", sum(egr.quantity)::int AS quantity
       FROM event_gear_requirements egr
       JOIN event_participants ep ON ep.event_id = egr.event_id
         AND ep.user_id = egr.participant_user_id
         AND ep.status = 'joined'
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

app.use((error: Error & { status?: number }, req: AuthedRequest, res: express.Response, _next: express.NextFunction) => {
  const traceId = req.traceId ?? `trc_${nanoid(12)}`;
  if (!req.traceId) {
    req.traceId = traceId;
    res.setHeader('X-Trace-Id', traceId);
  }
  if (error instanceof z.ZodError) {
    logError(error, req, 400, error.issues);
    res.status(400).json({ error: 'VALIDATION_ERROR', message: '请求参数不合法', traceId });
    return;
  }
  if (error instanceof multer.MulterError) {
    logError(error, req, 400);
    res.status(400).json({ error: 'BAD_REQUEST', message: '请求无法处理', traceId });
    return;
  }
  const status = error.status ?? 500;
  const publicStatus = status >= 400 && status < 600 ? status : 500;
  logError(error, req, publicStatus);
  res.status(publicStatus).json({
    error: errorCodeForStatus(publicStatus),
    message: errorMessageForStatus(publicStatus),
    traceId
  });
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
