// HTTP error handling of the built app, in-process. No database needed: every
// request here is answered before any query runs.
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const { after, before, test } = require('node:test');

// A throwaway key so the test never depends on a developer's .env.
process.env.APP_PKCS8_KEY = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;
process.env.NODE_ENV = 'production';
process.env.OPENOBSERVE_URL = '';
// None of these requests use Redis; point it at a closed port so the test never touches a real one.
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '1';

const { app } = require('../dist/server/server.js');
const { encryptor } = require('../dist/server/utils/jwt.js');
const Connection = require('../dist/server/config/connection.js').default;
const PlayerSessionControllerV1 = require('../dist/server/controllers/PlayerSession.v1.js').default;

let server;
let base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  Connection.Redis().disconnect();
});

const json = async (res) => ({ status: res.status, type: res.headers.get('content-type'), body: await res.json().catch(() => null) });

test('tampered admin and player cookies are 401, not 500', async () => {
  for (const [path, cookie] of [
    ['/api/v1/auth/profile', 'adminsid=garbage'],
    ['/api/v1/play/ABC123/questions', 'elsasid=garbage'],
  ]) {
    const { status, body } = await json(await fetch(base + path, { headers: { cookie } }));
    assert.equal(status, 401, path);
    assert.equal(body.code, 'invalid_token');
  }
  assert.equal((await fetch(`${base}/api/v1/auth/profile`)).status, 401, 'no cookie is still 401');
});

test('malformed and oversized JSON get the JSON error envelope', async () => {
  const malformed = await json(await fetch(`${base}/api/v1/play/ABC123/join`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
  }));
  assert.equal(malformed.status, 400);
  assert.match(malformed.type, /application\/json/);
  assert.equal(malformed.body.success, false);
  assert.equal(malformed.body.code, 'bad_request');
  assert.equal(malformed.body.message, 'Invalid JSON body');
  assert.ok(malformed.body.request_id);

  const tooLarge = await json(await fetch(`${base}/api/v1/play/ABC123/join`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'x'.repeat(1_100_000) }),
  }));
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.body.message, 'Request body too large');
});

test('/session/init keeps a valid cookie and replaces an invalid one', async () => {
  const fresh = await fetch(`${base}/api/v1/session/init`);
  assert.match(fresh.headers.get('set-cookie') ?? '', /^elsasid=/);

  const valid = await encryptor({ user_id: '01890a5d-ac96-7b6c-8f2a-3c4d5e6f7a8b' }, 1, 'day');
  const kept = await fetch(`${base}/api/v1/session/init`, { headers: { cookie: `elsasid=${valid}` } });
  assert.equal(kept.headers.get('set-cookie'), null);

  const replaced = await fetch(`${base}/api/v1/session/init`, { headers: { cookie: 'elsasid=garbage' } });
  assert.match(replaced.headers.get('set-cookie') ?? '', /^elsasid=/);
});

test('public session details list usernames without player ids', async () => {
  const controller = new PlayerSessionControllerV1({
    getSessionDetail: async () => ({
      id: 1, code: 'ABC123', name: 'Vocab', status: 'in_progress', started_at: null, finished_at: null,
      participants: [{ user_id: '01890a5d-ac96-7b6c-8f2a-3c4d5e6f7a8b', username: 'alice' }],
    }),
  }, {});
  let sent;
  await controller.getGameInfo({ params: { code: 'ABC123' } }, { success: (data) => { sent = data; } });
  assert.deepEqual(sent.participants, [{ username: 'alice' }]);
  assert.ok(!JSON.stringify(sent).includes('01890a5d'));
});
