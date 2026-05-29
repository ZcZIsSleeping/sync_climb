import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function resetDb() {
  const migrationFiles = (await fs.readdir(path.join(root, 'migrations')))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of migrationFiles) {
    const migration = await fs.readFile(path.join(root, 'migrations', file), 'utf8');
    await pool.query(migration);
  }
  await pool.query(`
    TRUNCATE event_gear_requirements,
             event_participants,
             events,
             team_members,
             teams,
             user_gears,
             users,
             gear_types
    CASCADE
  `);
  await pool.query(`
    INSERT INTO gear_types (id, name, icon_key, is_system)
    VALUES
      ('gear_quickdraw', '快挂', 'Q', true),
      ('gear_locking_carabiner', '主锁', 'L', true),
      ('gear_cam', '机械塞', 'C', true),
      ('gear_rope', '绳索', 'R', true),
      ('gear_nuts', '岩塞', 'N', true),
      ('gear_sling', '扁带', 'S', true),
      ('gear_tent', '帐篷', 'T', true)
  `);
}

async function login(code: string, nickname: string, avatarUrl = '') {
  const response = await request(app)
    .post('/auth/wechat-login')
    .send({ code, nickname, avatarUrl })
    .expect(200);

  return {
    token: response.body.token as string,
    userId: response.body.user.id as string,
    nickname: response.body.user.nickname as string,
    avatarUrl: response.body.user.avatarUrl as string
  };
}

const auth = (token: string) => `Bearer ${token}`;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await fs.rm(path.join(root, 'uploads'), { recursive: true, force: true });
  await pool.end();
});

function lastErrorLog() {
  const calls = consoleErrorSpy.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return JSON.parse(String(calls[calls.length - 1][0])) as Record<string, unknown>;
}

describe('health and auth', () => {
  it('responds to health checks and protects authenticated routes', async () => {
    await request(app).get('/health').expect(200, { ok: true });
    await request(app).get('/gear-types').expect(401);

    const alice = await login('alice-auth', 'Alice');
    const gearTypes = await request(app).get('/gear-types').set('authorization', auth(alice.token)).expect(200);
    expect(gearTypes.body.gearTypes).toHaveLength(7);
  });

  it('allows local acceptance accounts only when explicitly enabled', async () => {
    const previous = process.env.ENABLE_LOCAL_LOGIN;
    try {
      delete process.env.ENABLE_LOCAL_LOGIN;
      await request(app)
        .post('/auth/local-login')
        .send({ account: 'alice', password: '123456' })
        .expect(404);

      process.env.ENABLE_LOCAL_LOGIN = 'true';
      const alice = await request(app)
        .post('/auth/local-login')
        .send({ account: 'alice', password: '123456' })
        .expect(200);
      expect(alice.body.token).toMatch(/^sess_/);
      expect(alice.body.user.nickname).toBe('Alice');

      await request(app)
        .post('/auth/local-login')
        .send({ account: 'alice', password: 'wrong' })
        .expect(401);
    } finally {
      if (previous === undefined) {
        delete process.env.ENABLE_LOCAL_LOGIN;
      } else {
        process.env.ENABLE_LOCAL_LOGIN = previous;
      }
    }
  });

  it('returns safe errors with trace ids and logs original error context', async () => {
    const validation = await request(app)
      .post('/auth/wechat-login')
      .send({ code: 'x'.repeat(129), nickname: 'Alice', avatarUrl: '' })
      .expect(400);
    expect(validation.body).toEqual({
      error: 'VALIDATION_ERROR',
      message: '请求参数不合法',
      traceId: expect.stringMatching(/^trc_/)
    });
    expect(validation.body.details).toBeUndefined();
    expect(validation.headers['x-trace-id']).toBe(validation.body.traceId);
    const validationLog = lastErrorLog();
    expect(validationLog.traceId).toBe(validation.body.traceId);
    expect(validationLog.errorMessage).toContain('Too big');
    expect(validationLog.validationIssues).toBeTruthy();

    const missingTeam = await request(app)
      .post('/auth/wechat-login')
      .send({ code: 'safe-error-user', nickname: 'Alice', avatarUrl: '' })
      .expect(200)
      .then((loginResponse) => (
        request(app)
          .post('/teams/join')
          .set('authorization', auth(loginResponse.body.token))
          .send({ roomCode: 'ABCDEF' })
          .expect(404)
      ));
    expect(missingTeam.body).toEqual({
      error: 'NOT_FOUND',
      message: '资源不存在',
      traceId: expect.stringMatching(/^trc_/)
    });
    expect(missingTeam.body.error).not.toBe('team not found');
    expect(missingTeam.headers['x-trace-id']).toBe(missingTeam.body.traceId);
    const businessLog = lastErrorLog();
    expect(businessLog.traceId).toBe(missingTeam.body.traceId);
    expect(businessLog.errorMessage).toBe('team not found');
  });

  it('reuses the same local openid while rotating the token', async () => {
    const first = await login('same-user', 'First');
    const second = await login('same-user', 'Second');

    expect(second.userId).toBe(first.userId);
    expect(second.token).not.toBe(first.token);
    expect(second.nickname).toBe('First');
  });

  it('does not overwrite edited nicknames on repeated login', async () => {
    const first = await login('profile-user', 'Wechat Name', 'https://example.com/first.png');
    await request(app)
      .patch('/me/profile')
      .set('authorization', auth(first.token))
      .send({ nickname: '自定义昵称', avatarUrl: 'https://example.com/custom.png' })
      .expect(200);

    const second = await login('profile-user', 'Wechat Name Again', 'https://example.com/second.png');

    expect(second.userId).toBe(first.userId);
    expect(second.nickname).toBe('自定义昵称');
    expect(second.avatarUrl).toBe('https://example.com/custom.png');
  });

  it('keeps the existing avatar when profile updates omit avatarUrl', async () => {
    const first = await login('profile-avatar-user', 'Wechat Name', 'https://example.com/first.png');
    const profile = await request(app)
      .patch('/me/profile')
      .set('authorization', auth(first.token))
      .send({ nickname: '只改昵称' })
      .expect(200);

    expect(profile.body.user.nickname).toBe('只改昵称');
    expect(profile.body.user.avatarUrl).toBe('https://example.com/first.png');
    expect(profile.body.user.sportGrade).toBe('');
    expect(profile.body.user.tradGrade).toBe('');
  });

  it('stores climbing grades and belay skills on the user profile', async () => {
    const alice = await login('profile-capability-user', 'Alice');
    const profile = await request(app)
      .patch('/me/profile')
      .set('authorization', auth(alice.token))
      .send({
        sportGrade: '5.12b',
        tradGrade: '5.10d',
        belaySkills: {
          topRope: true,
          lead: true,
          multiPitch: false
        }
      })
      .expect(200);

    expect(profile.body.user).toMatchObject({
      nickname: 'Alice',
      sportGrade: '5.12b',
      tradGrade: '5.10d',
      belaySkills: {
        topRope: true,
        lead: true,
        multiPitch: false
      }
    });

    const repeated = await login('profile-capability-user', 'Alice Again');
    expect(repeated.userId).toBe(alice.userId);
    const relogin = await request(app)
      .post('/auth/wechat-login')
      .send({ code: 'profile-capability-user', nickname: 'Alice Again', avatarUrl: '' })
      .expect(200);
    expect(relogin.body.user.sportGrade).toBe('5.12b');
    expect(relogin.body.user.tradGrade).toBe('5.10d');
    expect(relogin.body.user.belaySkills).toEqual({
      topRope: true,
      lead: true,
      multiPitch: false
    });
  });

  it('uploads and stores user avatars', async () => {
    const alice = await login('avatar-upload-user', 'Alice');
    const upload = await request(app)
      .post('/me/avatar')
      .set('authorization', auth(alice.token))
      .attach('avatar', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'avatar.png',
        contentType: 'image/png'
      })
      .expect(201);

    expect(upload.body.avatarUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/uploads\/avatars\/usr_/);
    expect(upload.body.user.avatarUrl).toBe(upload.body.avatarUrl);

    const storedPath = new URL(upload.body.avatarUrl).pathname;
    await request(app).get(storedPath).expect(200);
  });
});

describe('input validation limits', () => {
  it('rejects strings that exceed business limits', async () => {
    const alice = await login('alice-validation', 'Alice');

    await request(app)
      .patch('/me/profile')
      .set('authorization', auth(alice.token))
      .send({ nickname: '山'.repeat(21) })
      .expect(400);

    await request(app)
      .patch('/me/profile')
      .set('authorization', auth(alice.token))
      .send({ sportGrade: '5.16a' })
      .expect(400);

    await request(app)
      .post('/me/events')
      .set('authorization', auth(alice.token))
      .send({ title: '训'.repeat(51), startDate: '2025-05-01', endDate: '2025-05-01' })
      .expect(400);

    await request(app)
      .post('/teams')
      .set('authorization', auth(alice.token))
      .send({ name: '队'.repeat(31) })
      .expect(400);

    await request(app)
      .post('/me/gears')
      .set('authorization', auth(alice.token))
      .send({ gearTypeId: 'gear_rope', name: '绳'.repeat(31), quantity: 1 })
      .expect(400);

    await request(app)
      .post('/teams/join')
      .set('authorization', auth(alice.token))
      .send({ roomCode: 'TOO-LONG' })
      .expect(400);
  });
});

describe('BaseCamp gear', () => {
  it('creates, updates and deletes user gear without leaking ownership', async () => {
    const alice = await login('alice-gear', 'Alice');
    const bob = await login('bob-gear', 'Bob');

    const created = await request(app)
      .post('/me/gears')
      .set('authorization', auth(alice.token))
      .send({ gearTypeId: 'gear_rope', name: '绳索', quantity: 2 })
      .expect(201);

    const gearId = created.body.gear.id;

    await request(app)
      .patch(`/me/gears/${gearId}`)
      .set('authorization', auth(bob.token))
      .send({ quantity: 5 })
      .expect(404);

    const updated = await request(app)
      .patch(`/me/gears/${gearId}`)
      .set('authorization', auth(alice.token))
      .send({ quantity: 3 })
      .expect(200);
    expect(updated.body.gear.quantity).toBe(3);

    await request(app).delete(`/me/gears/${gearId}`).set('authorization', auth(alice.token)).expect(204);
    const gears = await request(app).get('/me/gears').set('authorization', auth(alice.token)).expect(200);
    expect(gears.body.gears).toHaveLength(0);
  });

  it('persists custom user gear order', async () => {
    const alice = await login('alice-gear-order', 'Alice');
    const bob = await login('bob-gear-order', 'Bob');

    const rope = await request(app)
      .post('/me/gears')
      .set('authorization', auth(alice.token))
      .send({ gearTypeId: 'gear_rope', name: '绳索', quantity: 1 })
      .expect(201);
    const lock = await request(app)
      .post('/me/gears')
      .set('authorization', auth(alice.token))
      .send({ gearTypeId: 'gear_locking_carabiner', name: '主锁', quantity: 2 })
      .expect(201);
    const quickdraw = await request(app)
      .post('/me/gears')
      .set('authorization', auth(alice.token))
      .send({ gearTypeId: 'gear_quickdraw', name: '快挂', quantity: 12 })
      .expect(201);

    const initial = await request(app).get('/me/gears').set('authorization', auth(alice.token)).expect(200);
    expect(initial.body.gears.map((item: { id: string }) => item.id)).toEqual([
      quickdraw.body.gear.id,
      lock.body.gear.id,
      rope.body.gear.id
    ]);

    const orderedIds = [lock.body.gear.id, rope.body.gear.id, quickdraw.body.gear.id];
    const reordered = await request(app)
      .patch('/me/gears/order')
      .set('authorization', auth(alice.token))
      .send({ gearIds: orderedIds })
      .expect(200);
    expect(reordered.body).toEqual({ ok: true });

    const persisted = await request(app).get('/me/gears').set('authorization', auth(alice.token)).expect(200);
    expect(persisted.body.gears.map((item: { id: string }) => item.id)).toEqual(orderedIds);

    await request(app)
      .patch('/me/gears/order')
      .set('authorization', auth(bob.token))
      .send({ gearIds: orderedIds })
      .expect(400);
  });
});

describe('personal calendar events', () => {
  it('creates, lists, moves, edits and deletes personal events', async () => {
    const alice = await login('alice-personal-event', 'Alice');

    const created = await request(app)
      .post('/me/events')
      .set('authorization', auth(alice.token))
      .send({ title: '个人训练', startDate: '2025-05-01', endDate: '2025-05-03' })
      .expect(201);

    const eventId = created.body.event.id;

    const rope = await request(app)
      .post('/me/gears')
      .set('authorization', auth(alice.token))
      .send({ gearTypeId: 'gear_rope', name: '个人绳', quantity: 2 })
      .expect(201);

    const detail = await request(app)
      .get(`/me/events/${eventId}/detail`)
      .set('authorization', auth(alice.token))
      .expect(200);
    expect(detail.body.event.type).toBe('personal');
    expect(detail.body.event.status).toBe('joined');
    expect(detail.body.participants.map((item: { userId: string }) => item.userId)).toEqual([alice.userId]);

    const personalGear = await request(app)
      .patch(`/me/events/${eventId}/gear-requirements`)
      .set('authorization', auth(alice.token))
      .send({ requirements: [{ participantUserId: alice.userId, gearTypeId: 'gear_rope', userGearId: rope.body.gear.id, quantity: 1 }] })
      .expect(200);
    expect(personalGear.body.gearSummary).toEqual([
      { gearTypeId: 'gear_rope', name: '绳索', iconKey: 'R', quantity: 1 }
    ]);

    const listed = await request(app)
      .get('/me/calendar/events?start=2025-05-01&end=2025-05-31')
      .set('authorization', auth(alice.token))
      .expect(200);
    expect(listed.body.events).toHaveLength(1);
    expect(listed.body.events[0].type).toBe('personal');

    const moved = await request(app)
      .patch(`/me/events/${eventId}/move`)
      .set('authorization', auth(alice.token))
      .send({ startDate: '2025-06-10' })
      .expect(200);
    expect(moved.body.event.startDate).toBe('2025-06-10');
    expect(moved.body.event.endDate).toBe('2025-06-12');

    const renamed = await request(app)
      .patch(`/me/events/${eventId}`)
      .set('authorization', auth(alice.token))
      .send({ title: '雪山适应训练' })
      .expect(200);
    expect(renamed.body.event.title).toBe('雪山适应训练');

    await request(app).delete(`/me/events/${eventId}`).set('authorization', auth(alice.token)).expect(204);
    const afterDelete = await request(app)
      .get('/me/calendar/events?start=2025-06-01&end=2025-06-30')
      .set('authorization', auth(alice.token))
      .expect(200);
    expect(afterDelete.body.events).toHaveLength(0);
  });

  it('prevents users from modifying another user personal event', async () => {
    const alice = await login('alice-owned-event', 'Alice');
    const bob = await login('bob-owned-event', 'Bob');
    const created = await request(app)
      .post('/me/events')
      .set('authorization', auth(alice.token))
      .send({ title: '私人训练', startDate: '2025-05-01', endDate: '2025-05-01' })
      .expect(201);

    await request(app)
      .patch(`/me/events/${created.body.event.id}`)
      .set('authorization', auth(bob.token))
      .send({ title: '不能改' })
      .expect(404);
  });
});

describe('teams and team events', () => {
  it('handles pending, rejected and rejoined team event states', async () => {
    const alice = await login('alice-team', 'Alice');
    const bob = await login('bob-team', 'Bob');

    const team = await request(app)
      .post('/teams')
      .set('authorization', auth(alice.token))
      .send({ name: '测试小队' })
      .expect(201);
    const teamId = team.body.team.id;

    await request(app)
      .post('/teams/join')
      .set('authorization', auth(bob.token))
      .send({ roomCode: team.body.team.roomCode })
      .expect(200);

    const event = await request(app)
      .post(`/teams/${teamId}/events`)
      .set('authorization', auth(alice.token))
      .send({
        title: '团队攀登',
        startDate: '2025-06-01',
        endDate: '2025-06-02',
        participantUserIds: [bob.userId]
      })
      .expect(201);
    const eventId = event.body.event.id;

    const renamedByCreator = await request(app)
      .patch(`/me/events/${eventId}`)
      .set('authorization', auth(alice.token))
      .send({ title: '团队攀登更新' })
      .expect(200);
    expect(renamedByCreator.body.event.type).toBe('team');
    expect(renamedByCreator.body.event.title).toBe('团队攀登更新');

    const pendingCalendar = await request(app)
      .get('/me/calendar/events?start=2025-06-01&end=2025-06-30')
      .set('authorization', auth(bob.token))
      .expect(200);
    expect(pendingCalendar.body.events[0].type).toBe('pending_team');

    await request(app).post(`/me/events/${eventId}/reject`).set('authorization', auth(bob.token)).expect(200);

    const afterRejectCalendar = await request(app)
      .get('/me/calendar/events?start=2025-06-01&end=2025-06-30')
      .set('authorization', auth(bob.token))
      .expect(200);
    expect(afterRejectCalendar.body.events).toHaveLength(0);

    const afterRejectDetail = await request(app)
      .get(`/teams/${teamId}/events/${eventId}`)
      .set('authorization', auth(alice.token))
      .expect(200);
    expect(afterRejectDetail.body.participants.map((item: { userId: string }) => item.userId)).toEqual([alice.userId]);

    await request(app).post(`/teams/${teamId}/events/${eventId}/join`).set('authorization', auth(bob.token)).expect(200);

    const afterJoinDetail = await request(app)
      .get(`/teams/${teamId}/events/${eventId}`)
      .set('authorization', auth(alice.token))
      .expect(200);
    expect(afterJoinDetail.body.participants.map((item: { userId: string }) => item.userId).sort()).toEqual(
      [alice.userId, bob.userId].sort()
    );
  });

  it('filters team calendar and applies leave-team event cleanup', async () => {
    const alice = await login('alice-team-calendar', 'Alice');
    const bob = await login('bob-team-calendar', 'Bob');
    const team = await request(app).post('/teams').set('authorization', auth(alice.token)).send({ name: '日历队' });
    const teamId = team.body.team.id;
    await request(app).post('/teams/join').set('authorization', auth(bob.token)).send({ roomCode: team.body.team.roomCode });

    await request(app)
      .post('/me/events')
      .set('authorization', auth(bob.token))
      .send({ title: 'Bob个人训练', startDate: '2025-07-01', endDate: '2025-07-01' });
    const teamEvent = await request(app)
      .post(`/teams/${teamId}/events`)
      .set('authorization', auth(alice.token))
      .send({ title: '团队日程', startDate: '2025-07-02', endDate: '2025-07-02', participantUserIds: [bob.userId] });
    await request(app).post(`/me/events/${teamEvent.body.event.id}/accept`).set('authorization', auth(bob.token));

    const allEvents = await request(app)
      .get(`/teams/${teamId}/calendar/events?start=2025-07-01&end=2025-07-31&onlyTeamEvents=false`)
      .set('authorization', auth(alice.token))
      .expect(200);
    expect(allEvents.body.events.map((item: { type: string }) => item.type).sort()).toEqual(['member_personal', 'team']);

    const onlyTeamEvents = await request(app)
      .get(`/teams/${teamId}/calendar/events?start=2025-07-01&end=2025-07-31&onlyTeamEvents=true`)
      .set('authorization', auth(alice.token))
      .expect(200);
    expect(onlyTeamEvents.body.events).toHaveLength(1);
    expect(onlyTeamEvents.body.events[0].type).toBe('team');

    await request(app).delete(`/teams/${teamId}/leave`).set('authorization', auth(bob.token)).expect(204);
    await request(app)
      .get(`/teams/${teamId}/calendar/events?start=2025-07-01&end=2025-07-31`)
      .set('authorization', auth(bob.token))
      .expect(403);

    const bobCalendar = await request(app)
      .get('/me/calendar/events?start=2025-07-01&end=2025-07-31')
      .set('authorization', auth(bob.token))
      .expect(200);
    expect(bobCalendar.body.events.map((item: { type: string }) => item.type)).toEqual(['personal']);
  });

  it('lets a later team member self-join an existing team event', async () => {
    const alice = await login('alice-late-event', 'Alice');
    const bob = await login('bob-late-event', 'Bob');
    const team = await request(app).post('/teams').set('authorization', auth(alice.token)).send({ name: '后加入队' }).expect(201);
    const teamId = team.body.team.id;
    const event = await request(app)
      .post(`/teams/${teamId}/events`)
      .set('authorization', auth(alice.token))
      .send({ title: '先创建事件', startDate: '2025-09-01', endDate: '2025-09-01', participantUserIds: [] })
      .expect(201);

    await request(app).post('/teams/join').set('authorization', auth(bob.token)).send({ roomCode: team.body.team.roomCode }).expect(200);

    const beforeJoin = await request(app)
      .get(`/teams/${teamId}/calendar/events?start=2025-09-01&end=2025-09-30&onlyTeamEvents=true`)
      .set('authorization', auth(bob.token))
      .expect(200);
    expect(beforeJoin.body.events[0].id).toBe(event.body.event.id);
    expect(beforeJoin.body.events[0].status).toBeNull();

    const detail = await request(app)
      .get(`/teams/${teamId}/events/${event.body.event.id}`)
      .set('authorization', auth(bob.token))
      .expect(200);
    expect(detail.body.event.status).toBeNull();
    expect(detail.body.participants.map((item: { userId: string }) => item.userId)).toEqual([alice.userId]);

    await request(app).post(`/me/events/${event.body.event.id}/accept`).set('authorization', auth(bob.token)).expect(200);
    const afterAccept = await request(app)
      .get(`/teams/${teamId}/events/${event.body.event.id}`)
      .set('authorization', auth(bob.token))
      .expect(200);
    expect(afterAccept.body.event.status).toBe('joined');
    expect(afterAccept.body.participants.map((item: { userId: string }) => item.userId).sort()).toEqual(
      [alice.userId, bob.userId].sort()
    );

    await request(app).post(`/me/events/${event.body.event.id}/reject`).set('authorization', auth(bob.token)).expect(200);
    const afterReject = await request(app)
      .get(`/teams/${teamId}/events/${event.body.event.id}`)
      .set('authorization', auth(bob.token))
      .expect(200);
    expect(afterReject.body.event.status).toBe('rejected');
    expect(afterReject.body.participants.map((item: { userId: string }) => item.userId)).toEqual([alice.userId]);

    await request(app).post(`/me/events/${event.body.event.id}/accept`).set('authorization', auth(bob.token)).expect(200);

    const afterJoin = await request(app)
      .get(`/teams/${teamId}/events/${event.body.event.id}`)
      .set('authorization', auth(bob.token))
      .expect(200);
    expect(afterJoin.body.event.status).toBe('joined');
    expect(afterJoin.body.participants.map((item: { userId: string }) => item.userId).sort()).toEqual(
      [alice.userId, bob.userId].sort()
    );
  });
});

describe('team event gear requirements', () => {
  it('lets the creator assign gear within owned quantities only', async () => {
    const alice = await login('alice-gear-event', 'Alice');
    const bob = await login('bob-gear-event', 'Bob');

    const aliceRope = await request(app)
      .post('/me/gears')
      .set('authorization', auth(alice.token))
      .send({ gearTypeId: 'gear_rope', name: '绳索', quantity: 2 })
      .expect(201);

    const bobQuickdraw = await request(app)
      .post('/me/gears')
      .set('authorization', auth(bob.token))
      .send({ gearTypeId: 'gear_quickdraw', name: '快挂', quantity: 6 })
      .expect(201);

    const bobAlpineDraw = await request(app)
      .post('/me/gears')
      .set('authorization', auth(bob.token))
      .send({ gearTypeId: 'gear_quickdraw', name: '长扁带快挂', quantity: 4 })
      .expect(201);

    const team = await request(app).post('/teams').set('authorization', auth(alice.token)).send({ name: '装备队' }).expect(201);
    const teamId = team.body.team.id;
    await request(app).post('/teams/join').set('authorization', auth(bob.token)).send({ roomCode: team.body.team.roomCode });

    const event = await request(app)
      .post(`/teams/${teamId}/events`)
      .set('authorization', auth(alice.token))
      .send({ title: '装备日程', startDate: '2025-08-01', endDate: '2025-08-01', participantUserIds: [bob.userId] });
    const eventId = event.body.event.id;
    await request(app).post(`/me/events/${eventId}/accept`).set('authorization', auth(bob.token)).expect(200);

    await request(app)
      .patch(`/teams/${teamId}/events/${eventId}/gear-requirements`)
      .set('authorization', auth(bob.token))
      .send({ requirements: [{ participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobQuickdraw.body.gear.id, quantity: 1 }] })
      .expect(403);

    await request(app)
      .patch(`/teams/${teamId}/events/${eventId}/gear-requirements`)
      .set('authorization', auth(alice.token))
      .send({ requirements: [{ participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobQuickdraw.body.gear.id, quantity: 7 }] })
      .expect(400);

    const assigned = await request(app)
      .patch(`/teams/${teamId}/events/${eventId}/gear-requirements`)
      .set('authorization', auth(alice.token))
      .send({ requirements: [{ participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobQuickdraw.body.gear.id, quantity: 3 }] })
      .expect(200);
    expect(assigned.body.gearSummary).toEqual([
      { gearTypeId: 'gear_quickdraw', name: '快挂', iconKey: 'Q', quantity: 3 }
    ]);

    const detail = await request(app).get(`/teams/${teamId}/events/${eventId}`).set('authorization', auth(alice.token)).expect(200);
    expect(detail.body.requirements).toEqual([
      {
        participantUserId: bob.userId,
        gearTypeId: 'gear_quickdraw',
        userGearId: bobQuickdraw.body.gear.id,
        name: '快挂',
        typeName: '快挂',
        iconKey: 'Q',
        quantity: 3
      }
    ]);

    const merged = await request(app)
      .patch(`/teams/${teamId}/events/${eventId}/gear-requirements`)
      .set('authorization', auth(alice.token))
      .send({
        requirements: [
          { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobQuickdraw.body.gear.id, quantity: 3 },
          { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobAlpineDraw.body.gear.id, quantity: 2 },
          { participantUserId: alice.userId, gearTypeId: 'gear_rope', userGearId: aliceRope.body.gear.id, quantity: 1 }
        ]
      })
      .expect(200);
    expect(merged.body.gearSummary).toEqual([
      { gearTypeId: 'gear_quickdraw', name: '快挂', iconKey: 'Q', quantity: 5 },
      { gearTypeId: 'gear_rope', name: '绳索', iconKey: 'R', quantity: 1 }
    ]);

    const afterMerge = await request(app).get(`/teams/${teamId}/events/${eventId}`).set('authorization', auth(alice.token)).expect(200);
    expect(afterMerge.body.requirements).toHaveLength(3);
    expect(afterMerge.body.requirements).toEqual(expect.arrayContaining([
      { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobQuickdraw.body.gear.id, name: '快挂', typeName: '快挂', iconKey: 'Q', quantity: 3 },
      { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobAlpineDraw.body.gear.id, name: '长扁带快挂', typeName: '快挂', iconKey: 'Q', quantity: 2 },
      { participantUserId: alice.userId, gearTypeId: 'gear_rope', userGearId: aliceRope.body.gear.id, name: '绳索', typeName: '绳索', iconKey: 'R', quantity: 1 }
    ]));

    await request(app)
      .patch(`/teams/${teamId}/events/${eventId}/gear-requirements`)
      .set('authorization', auth(alice.token))
      .send({
        requirements: [
          { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobQuickdraw.body.gear.id, quantity: 0 },
          { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobAlpineDraw.body.gear.id, quantity: 2 },
          { participantUserId: alice.userId, gearTypeId: 'gear_rope', userGearId: aliceRope.body.gear.id, quantity: 1 }
        ]
      })
      .expect(200);

    const afterDeleteZero = await request(app).get(`/teams/${teamId}/events/${eventId}`).set('authorization', auth(alice.token)).expect(200);
    expect(afterDeleteZero.body.requirements).toHaveLength(2);
    expect(afterDeleteZero.body.requirements).toEqual(expect.arrayContaining([
      { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobAlpineDraw.body.gear.id, name: '长扁带快挂', typeName: '快挂', iconKey: 'Q', quantity: 2 },
      { participantUserId: alice.userId, gearTypeId: 'gear_rope', userGearId: aliceRope.body.gear.id, name: '绳索', typeName: '绳索', iconKey: 'R', quantity: 1 }
    ]));

    await request(app).post(`/teams/${teamId}/events/${eventId}/leave`).set('authorization', auth(alice.token)).expect(400);
    await request(app).post(`/teams/${teamId}/events/${eventId}/leave`).set('authorization', auth(bob.token)).expect(200);

    const afterLeave = await request(app).get(`/teams/${teamId}/events/${eventId}`).set('authorization', auth(alice.token)).expect(200);
    expect(afterLeave.body.gearSummary).toEqual([
      { gearTypeId: 'gear_rope', name: '绳索', iconKey: 'R', quantity: 1 }
    ]);
    expect(afterLeave.body.requirements).toEqual([
      { participantUserId: alice.userId, gearTypeId: 'gear_rope', userGearId: aliceRope.body.gear.id, name: '绳索', typeName: '绳索', iconKey: 'R', quantity: 1 }
    ]);
  });
});
