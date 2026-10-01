require('@swc-node/register');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { default: LeaderboardService, rankScores } = require('../src/server/services/Leaderboard.service.ts');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SESSION = { id: 1, code: 'ABC123' };

const setup = (throttleMs = 40) => {
  const scores = new Map();
  const names = new Map();
  const published = [];
  const answerRepo = {
    addPlayer: async (_sid, pid, username) => { if (!scores.has(pid)) scores.set(pid, 0); names.set(pid, username); },
    getTopScores: async (_sid, limit) => [...scores]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([player_id, score]) => ({ player_id, username: names.get(player_id), score })),
  };
  const sessionRepo = { getSessionByCode: async (code) => (code === SESSION.code ? SESSION : null) };
  const events = { leaderboardUpdated: (code, leaderboard) => published.push({ code, leaderboard }) };
  const service = new LeaderboardService(sessionRepo, answerRepo, events, { size: 2, throttleMs });
  return { service, scores, published };
};

test('equal scores share a rank and the next rank skips', () => {
  const ranked = rankScores([
    { player_id: 1, username: 'a', score: 300 },
    { player_id: 2, username: 'b', score: 200 },
    { player_id: 3, username: 'c', score: 200 },
    { player_id: 4, username: 'd', score: 100 },
  ]);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 2, 4]);
});

test('joining lists the player with 0 points and broadcasts', async () => {
  const { service, published } = setup();
  await service.addPlayer(SESSION, 7, 'alice');
  await sleep(5);
  assert.deepEqual(published, [{ code: 'ABC123', leaderboard: [{ rank: 1, player_id: 7, username: 'alice', score: 0 }] }]);
});

test('a burst of score changes becomes one immediate and one trailing broadcast', async () => {
  const { service, scores, published } = setup(40);
  await service.addPlayer(SESSION, 1, 'alice');
  await service.addPlayer(SESSION, 2, 'bob');
  await service.addPlayer(SESSION, 3, 'carol');
  for (let i = 0; i < 20; i++) {
    scores.set(3, (i + 1) * 100);
    service.scoreChanged(SESSION);
  }
  await sleep(5);
  assert.equal(published.length, 1, 'only the leading broadcast so far');

  await sleep(80);
  assert.equal(published.length, 2, 'one trailing broadcast for the whole burst');
  const last = published.at(-1).leaderboard;
  assert.equal(last.length, 2, 'limited to the configured size');
  assert.deepEqual(last[0], { rank: 1, player_id: 3, username: 'carol', score: 2000 });

  await sleep(80);
  assert.equal(published.length, 2, 'no further broadcasts without changes');
});

test('sessions are throttled independently, and unknown codes give an empty board', async () => {
  const { service, published } = setup(40);
  service.scoreChanged(SESSION);
  service.scoreChanged({ id: 2, code: 'XYZ789' });
  await sleep(5);
  assert.deepEqual(published.map((p) => p.code), ['ABC123', 'XYZ789']);
  assert.deepEqual(await service.getLeaderboardByCode('NOPE00'), []);
});
