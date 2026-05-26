import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function resetDb() {
  const migration = await fs.readFile(path.join(root, 'migrations/001_init.sql'), 'utf8');
  await pool.query(migration);
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
      ('gear_rope', '绳索', 'R', true)
  `);
}

async function login(code: string, nickname: string) {
  const response = await request(app)
    .post('/auth/wechat-login')
    .send({ code, nickname, avatarUrl: '' })
    .expect(200);

  return {
    token: response.body.token as string,
    userId: response.body.user.id as string
  };
}

const auth = (token: string) => `Bearer ${token}`;

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe('health and auth', () => {
  it('responds to health checks and protects authenticated routes', async () => {
    await request(app).get('/health').expect(200, { ok: true });
    await request(app).get('/gear-types').expect(401);

    const alice = await login('alice-auth', 'Alice');
    const gearTypes = await request(app).get('/gear-types').set('authorization', auth(alice.token)).expect(200);
    expect(gearTypes.body.gearTypes).toHaveLength(4);
  });

  it('reuses the same local openid while rotating the token', async () => {
    const first = await login('same-user', 'First');
    const second = await login('same-user', 'Second');

    expect(second.userId).toBe(first.userId);
    expect(second.token).not.toBe(first.token);
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
    expect(afterMerge.body.requirements).toEqual([
      { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobQuickdraw.body.gear.id, name: '快挂', typeName: '快挂', iconKey: 'Q', quantity: 3 },
      { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobAlpineDraw.body.gear.id, name: '长扁带快挂', typeName: '快挂', iconKey: 'Q', quantity: 2 },
      { participantUserId: alice.userId, gearTypeId: 'gear_rope', userGearId: aliceRope.body.gear.id, name: '绳索', typeName: '绳索', iconKey: 'R', quantity: 1 }
    ]);

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
    expect(afterDeleteZero.body.requirements).toEqual([
      { participantUserId: bob.userId, gearTypeId: 'gear_quickdraw', userGearId: bobAlpineDraw.body.gear.id, name: '长扁带快挂', typeName: '快挂', iconKey: 'Q', quantity: 2 },
      { participantUserId: alice.userId, gearTypeId: 'gear_rope', userGearId: aliceRope.body.gear.id, name: '绳索', typeName: '绳索', iconKey: 'R', quantity: 1 }
    ]);
  });
});
