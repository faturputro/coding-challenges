require('@swc-node/register');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const QuizPlayService = require('../src/server/services/QuizPlay.service.ts').default;

const USER = 'user-1';
const QUESTION = {
  id: 7,
  question: 'What does "ephemeral" mean?',
  choices: [
    { id: 'a', label: 'Lasting a short time', is_correct: true },
    { id: 'b', label: 'Very large', is_correct: false },
  ],
};

const setup = (sessionOverrides = {}, { joined = true, enqueueFails = false } = {}) => {
  const session = {
    id: 3, code: 'ABC123', status: 'in_progress',
    finished_at: new Date(Date.now() + 60 * 60_000), ...sessionOverrides,
  };
  const answers = new Map();
  let score = 0;
  const calls = { recorded: [], enqueued: [], scoreChanged: [] };

  const sessionRepo = {
    getSessionByCode: async (code) => (code === session.code ? session : null),
    getPlayersSessionDetail: async (userId, sessionId) => (joined && userId === USER && sessionId === session.id ? { id: 42, username: 'alice' } : null),
  };
  const questionRepo = {
    listQuestions: async () => [QUESTION],
    getQuestion: async (id) => (id === QUESTION.id ? QUESTION : null),
  };
  // Mirrors the Lua script: first answer wins, points added once.
  const answerRepo = {
    recordAnswer: async (dto) => {
      calls.recorded.push(dto);
      if (answers.has(dto.questionId)) return { recorded: false, previousAnswer: answers.get(dto.questionId), totalScore: score };
      answers.set(dto.questionId, dto.answer);
      score += dto.points;
      return { recorded: true, totalScore: score };
    },
    getAnswers: async () => Object.fromEntries([...answers].map(([k, v]) => [String(k), v])),
    getScore: async () => score,
  };
  const enqueue = async (job) => {
    if (enqueueFails) throw new Error('redis down');
    calls.enqueued.push(job);
  };

  const leaderboard = { scoreChanged: (s) => calls.scoreChanged.push(s.code) };
  return { service: new QuizPlayService(sessionRepo, questionRepo, answerRepo, enqueue, leaderboard), calls, session };
};

const answer = (service, overrides = {}) =>
  service.submitAnswer({ code: 'ABC123', user_id: USER, question_id: '7', answer: 'a', ...overrides });

const CODES = { 403: 'forbidden', 404: 'not_found', 409: 'conflict', 422: 'validation_failed' };
const rejectsWith = (promise, status, message) =>
  assert.rejects(promise, (e) => e.code === CODES[status] && (!message || e.message === message));

test('questions never expose which choice is correct', async () => {
  const { service } = setup();
  const result = await service.getQuestions('ABC123', USER);
  assert.deepEqual(result.questions, [{ id: 7, question: QUESTION.question, choices: [{ id: 'a', label: 'Lasting a short time' }, { id: 'b', label: 'Very large' }] }]);
  assert.ok(!JSON.stringify(result).includes('is_correct'));
  assert.equal(result.total_score, 0);
});

test('a correct answer scores on the server and is queued for persistence', async () => {
  const { service, calls } = setup();
  const result = await answer(service, { answer: ' A ' });
  assert.deepEqual(result, { correct: true, points: 100, total_score: 100, correct_answer: 'a' });
  assert.equal(calls.enqueued.length, 1);
  assert.equal(calls.recorded[0].username, 'alice');
  assert.deepEqual(calls.scoreChanged, ['ABC123']);
  assert.deepEqual(
    { ...calls.enqueued[0], answeredAt: undefined },
    { quizSessionId: 3, quizQuestionId: 7, quizParticipantId: 42, answer: 'a', score: 100, totalScore: 100, answeredAt: undefined },
  );
});

test('a wrong answer scores 0 and reveals the right one', async () => {
  const { service } = setup();
  assert.deepEqual(await answer(service, { answer: 'b' }), { correct: false, points: 0, total_score: 0, correct_answer: 'a' });
});

test('only the first answer to a question counts', async () => {
  const { service, calls } = setup();
  await answer(service, { answer: 'b' });
  await rejectsWith(answer(service, { answer: 'a' }), 409, 'You already answered this question');
  assert.equal(calls.enqueued.length, 1);
  assert.equal(calls.scoreChanged.length, 1, 'a rejected duplicate does not trigger a leaderboard broadcast');
  assert.equal((await service.getQuestions('ABC123', USER)).total_score, 0);
});

test('rejects invalid input, unknown questions and choices', async () => {
  const { service, calls } = setup();
  await rejectsWith(answer(service, { answer: '' }), 422);
  await rejectsWith(answer(service, { answer: 'ab' }), 422);
  await rejectsWith(answer(service, { question_id: 'x' }), 422);
  await rejectsWith(answer(service, { question_id: '999' }), 404, 'Question not found');
  await rejectsWith(answer(service, { answer: 'z' }), 422);
  assert.equal(calls.recorded.length, 0);
});

test('only joined players can play, and only while the session runs', async () => {
  await rejectsWith(answer(setup({}, { joined: false }).service), 403);
  await rejectsWith(answer(setup({ status: 'not_started', finished_at: null }).service), 409, 'The quiz has not started yet');
  await rejectsWith(setup({ status: 'not_started', finished_at: null }).service.getQuestions('ABC123', USER), 409);
  await rejectsWith(answer(setup({ status: 'finished' }).service), 409, 'The quiz has ended');
  await rejectsWith(answer(setup({ finished_at: new Date(Date.now() - 1000) }).service), 409, 'The quiz has ended');
  await rejectsWith(answer(setup().service, { code: 'NOPE00' }), 404);
});

test('a queue outage does not fail an answer that was already scored', async () => {
  const { service } = setup({}, { enqueueFails: true });
  assert.equal((await answer(service)).total_score, 100);
});
