require('@swc-node/register');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const QuizSessionService = require('../src/server/services/Session.service.ts').default;

const USER = '01890a5d-ac96-7b6c-8f2a-3c4d5e6f7a8b';

const setup = (session) => {
  const state = { session: { id: 1, code: 'ABC123', name: 'Vocab', status: 'not_started', started_at: null, finished_at: null, ...session }, participants: [] };
  const calls = { events: [], scheduled: [], updates: [], listed: [] };
  const repo = {
    getSessionByCode: async (code) => (code === state.session.code ? { ...state.session } : null),
    getSessionDetailByCode: async (code) => (code === state.session.code ? { ...state.session, participants: [...state.participants] } : null),
    getPlayersSessionDetail: async (userId) => state.participants.find((p) => p.user_id === userId) ?? null,
    createUserGameSession: async ({ user_id, username }) => { state.participants.push({ id: state.participants.length + 1, user_id, username }); },
    updateSession: async (_id, dto) => { calls.updates.push(dto); Object.assign(state.session, dto); },
  };
  const redisRepo = { set: async () => {} };
  const events = { sessionUpdated: (reason, snapshot) => calls.events.push({ reason, snapshot }) };
  const scheduler = { scheduleFinish: async (code, at) => { calls.scheduled.push({ code, at }); } };
  const leaderboard = { addPlayer: async (session, participantId, username) => { calls.listed.push({ code: session.code, participantId, username }); } };
  return { service: new QuizSessionService(repo, redisRepo, events, scheduler, leaderboard), state, calls };
};

test('joining broadcasts the new player count once, without player ids', async () => {
  const { service, calls } = setup();
  await service.joinSession({ code: 'ABC123', user_id: USER, username: 'alice' });
  await service.joinSession({ code: 'ABC123', user_id: USER, username: 'alice' });

  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].reason, 'player_joined');
  assert.equal(calls.events[0].snapshot.total_players, 1);
  assert.ok(!JSON.stringify(calls.events[0].snapshot).includes(USER));
  assert.deepEqual(calls.listed, [{ code: 'ABC123', participantId: 1, username: 'alice' }]);
  assert.deepEqual(await service.getPlayerInSession('ABC123', USER), { id: 1, username: 'alice' });
  assert.equal(await service.getPlayerInSession('ABC123', 'someone-else'), null);
});

test('starting broadcasts in_progress and schedules the finish at finished_at', async () => {
  const { service, state, calls } = setup();
  state.participants.push({ user_id: USER, username: 'alice' });
  await service.startSession('ABC123');

  assert.equal(calls.events.length, 1);
  const { reason, snapshot } = calls.events[0];
  assert.equal(reason, 'started');
  assert.equal(snapshot.status, 'in_progress');
  assert.equal(calls.scheduled.length, 1);
  assert.equal(calls.scheduled[0].code, 'ABC123');
  assert.equal(calls.scheduled[0].at.toISOString(), snapshot.finished_at);
});

test('finishing is idempotent and never ends a session early', async () => {
  const future = new Date(Date.now() + 60_000);
  const early = setup({ status: 'in_progress', finished_at: future });
  await early.service.finishSession('ABC123');
  assert.equal(early.calls.updates.length, 0);
  assert.equal(early.calls.events.length, 0);

  const due = setup({ status: 'in_progress', finished_at: new Date(Date.now() - 1000) });
  await due.service.finishSession('ABC123');
  await due.service.finishSession('ABC123');
  assert.deepEqual(due.calls.updates, [{ status: 'finished' }]);
  assert.deepEqual(due.calls.events.map((e) => [e.reason, e.snapshot.status]), [['finished', 'finished']]);

  const unknown = setup();
  await unknown.service.finishSession('NOPE00');
  assert.equal(unknown.calls.updates.length, 0);
});
