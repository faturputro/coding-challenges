const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');
const { io: connect } = require('socket.io-client');
const { createSocketServer } = require('../dist/server/realtime/socket.js');
const { sessionRoom } = require('../dist/server/types/realtime.js');

const ORIGIN = 'http://allowed.test';
const BOARD = [{ rank: 1, player_id: 7, username: 'alice', score: 100 }];
const sessions = {
  ABC123: { code: 'ABC123', name: 'Vocab', status: 'not_started', started_at: null, finished_at: null, total_players: 2 },
  XYZ789: { code: 'XYZ789', name: null, status: 'in_progress', started_at: null, finished_at: null, total_players: 0 },
};

const setup = async () => {
  const server = http.createServer();
  const io = createSocketServer(server, {
    playerCookie: 'elsasid',
    allowedOrigins: [ORIGIN],
    verifyPlayer: async (token) => {
      if (token !== 'good-token') throw new Error('bad token');
      return 'user-1';
    },
    getSnapshot: async (code) => sessions[code] ?? null,
    getPlayer: async (code, userId) => (code === 'ABC123' && userId === 'user-1' ? { id: 7, username: 'alice' } : null),
    getLeaderboard: async (code) => (code === 'ABC123' ? BOARD : []),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const clients = [];
  const client = (headers = {}) => {
    const socket = connect(url, { transports: ['websocket'], reconnection: false, extraHeaders: { origin: ORIGIN, ...headers } });
    clients.push(socket);
    return socket;
  };
  const close = async () => {
    clients.forEach((socket) => socket.close());
    await new Promise((resolve) => io.close(resolve));
  };
  return { io, client, close };
};

const connected = (socket) => new Promise((resolve, reject) => {
  socket.once('connect', resolve);
  socket.once('connect_error', reject);
});
const subscribe = (socket, code) => socket.timeout(2000).emitWithAck('session:subscribe', code);

test('rejects sockets without a valid player cookie or from other origins', async () => {
  const { client, close } = await setup();
  try {
    await assert.rejects(connected(client()), /unauthorized/);
    await assert.rejects(connected(client({ cookie: 'elsasid=forged' })), /unauthorized/);
    await assert.rejects(connected(client({ cookie: 'elsasid=good-token', origin: 'http://evil.test' })));
    await connected(client({ cookie: 'theme=dark; elsasid=good-token' }));
  } finally {
    await close();
  }
});

test('subscribe returns the snapshot and whether this player already joined', async () => {
  const { client, close } = await setup();
  try {
    const socket = client({ cookie: 'elsasid=good-token' });
    await connected(socket);
    assert.deepEqual(await subscribe(socket, 'ABC123'), { ok: true, session: sessions.ABC123, player: { id: 7, username: 'alice' }, leaderboard: BOARD });
    assert.deepEqual(await subscribe(socket, 'XYZ789'), { ok: true, session: sessions.XYZ789, player: null, leaderboard: [] });
    assert.deepEqual(await subscribe(socket, 'NOPE00'), { ok: false, error: 'Session not found' });
    assert.deepEqual(await subscribe(socket, '../etc'), { ok: false, error: 'Invalid session code' });
  } finally {
    await close();
  }
});

test('updates reach only sockets subscribed to that session', async () => {
  const { io, client, close } = await setup();
  try {
    const a = client({ cookie: 'elsasid=good-token' });
    const b = client({ cookie: 'elsasid=good-token' });
    await Promise.all([connected(a), connected(b)]);
    await subscribe(a, 'ABC123');
    await subscribe(b, 'XYZ789');

    const received = { a: [], b: [] };
    a.on('session:updated', (payload) => received.a.push(payload));
    b.on('session:updated', (payload) => received.b.push(payload));

    const started = { ...sessions.ABC123, status: 'in_progress' };
    io.to(sessionRoom('ABC123')).emit('session:updated', { reason: 'started', session: started });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepEqual(received.a, [{ reason: 'started', session: started }]);
    assert.deepEqual(received.b, []);

    // Switching sessions leaves the previous room.
    await subscribe(a, 'XYZ789');
    io.to(sessionRoom('ABC123')).emit('session:updated', { reason: 'finished', session: started });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(received.a.length, 1);
  } finally {
    await close();
  }
});
