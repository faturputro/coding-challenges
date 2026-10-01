// Runs the answer-recording Lua script against a real Redis. Needs QUIZ_TEST_REDIS_URL
// (a disposable instance); skipped otherwise so it never touches a shared Redis.
require('@swc-node/register');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const Redis = require('ioredis');

const url = process.env.QUIZ_TEST_REDIS_URL;

test('records the first answer atomically and expires the session state', { skip: !url && 'QUIZ_TEST_REDIS_URL not set' }, async () => {
  const { default: QuizAnswerRepository, answersKey, leaderboardKey, playersKey } = require('../src/server/repositories/QuizAnswer.repository.ts');
  const redis = new Redis(url);
  try {
    await redis.flushdb();
    const repo = new QuizAnswerRepository(redis);
    const expireAt = new Date(Date.now() + 3600_000);
    const base = { sessionId: 1, participantId: 5, username: 'alice', expireAt };

    // 50 concurrent submissions of the same question: exactly one scores.
    const results = await Promise.all(Array.from({ length: 50 }, (_, i) =>
      repo.recordAnswer({ ...base, questionId: 1, answer: i === 0 ? 'a' : 'b', points: 100 })));
    assert.equal(results.filter((r) => r.recorded).length, 1);
    assert.equal(await repo.getScore(1, 5), 100);
    const duplicate = results.find((r) => !r.recorded);
    assert.equal(duplicate.totalScore, 100);
    assert.equal(duplicate.previousAnswer, (await repo.getAnswers(1, 5))['1']);

    const wrong = await repo.recordAnswer({ ...base, questionId: 2, answer: 'c', points: 0 });
    assert.deepEqual(wrong, { recorded: true, totalScore: 100 });
    assert.deepEqual(Object.keys(await repo.getAnswers(1, 5)).sort(), ['1', '2']);

    // A wrong first answer still puts the player on the leaderboard (score 0).
    await repo.recordAnswer({ ...base, participantId: 6, username: 'bob', questionId: 1, answer: 'b', points: 0 });
    assert.deepEqual(await redis.zrevrange(leaderboardKey(1), 0, -1, 'WITHSCORES'), ['5', '100', '6', '0']);

    // Joining lists a player at 0 without resetting an existing score.
    await repo.addPlayer(1, 7, 'carol');
    await repo.addPlayer(1, 5, 'alice');
    assert.deepEqual(await repo.getTopScores(1, 10), [
      { player_id: 5, username: 'alice', score: 100 },
      { player_id: 7, username: 'carol', score: 0 },
      { player_id: 6, username: 'bob', score: 0 },
    ]);
    assert.deepEqual(await repo.getTopScores(1, 1), [{ player_id: 5, username: 'alice', score: 100 }]);
    assert.deepEqual(await repo.getTopScores(99, 10), []);

    for (const key of [answersKey(1, 5), leaderboardKey(1), playersKey(1)]) {
      const ttl = await redis.ttl(key);
      assert.ok(ttl > 3500 && ttl <= 3601, `${key} ttl ${ttl}`);
    }
    assert.equal(await repo.getScore(1, 999), 0);

    // A session nobody has answered in yet gets the joined-player TTL.
    await repo.addPlayer(2, 1, 'dave');
    assert.ok(await redis.ttl(leaderboardKey(2)) > 3600 * 24);
  } finally {
    await redis.flushdb();
    redis.disconnect();
  }
});
