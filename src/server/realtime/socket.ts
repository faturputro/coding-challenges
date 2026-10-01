import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents, LeaderboardEntry, ServerToClientEvents, SessionPlayer, SessionSnapshot, SocketData,
} from '../types/realtime';
import { sessionRoom } from '../types/realtime';
import { logger } from '../utils/logger';
import { appMetrics } from '../utils/metrics';

export type QuizSocketServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export interface SocketServerDeps {
  /** Name of the HttpOnly cookie holding the player token (set by GET /session/init). */
  playerCookie: string;
  /** Resolves the player id from the cookie token; throws if invalid or expired. */
  verifyPlayer: (token: string) => Promise<string>;
  /** Current public state of a session, or null if the code is unknown. */
  getSnapshot: (code: string) => Promise<SessionSnapshot | null>;
  /** Whether this player has already joined the session (e.g. after a page refresh). */
  getPlayer: (code: string, userId: string) => Promise<SessionPlayer>;
  /** Current top of the leaderboard, sent with the subscription so the page doesn't wait for a change. */
  getLeaderboard: (code: string) => Promise<LeaderboardEntry[]>;
  /** Origins allowed to open a socket. CORS does not cover WebSockets, so this is checked explicitly. */
  allowedOrigins: string[];
  /** e.g. the Redis adapter, so rooms span every API node. */
  adapter?: Parameters<QuizSocketServer['adapter']>[0];
}

const readCookie = (header: string | undefined, name: string) => {
  for (const part of header?.split(';') ?? []) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
};

const CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export const createSocketServer = (httpServer: HttpServer, deps: SocketServerDeps): QuizSocketServer => {
  const io: QuizSocketServer = new Server(httpServer, {
    serveClient: false,
    // The cookie carries identity, so a page on another origin must not be able to open a socket with it.
    allowRequest: (req: IncomingMessage, callback) => {
      const origin = req.headers.origin;
      callback(null, !origin || deps.allowedOrigins.includes(origin));
    },
    ...(deps.adapter ? { adapter: deps.adapter } : {}),
  });

  io.use(async (socket, next) => {
    const token = readCookie(socket.request.headers.cookie, deps.playerCookie);
    if (!token) return next(new Error('unauthorized'));
    try {
      socket.data.userId = await deps.verifyPlayer(token);
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    appMetrics.socketsActive.add(1);
    socket.on('disconnect', () => appMetrics.socketsActive.add(-1));

    socket.on('session:subscribe', async (code, ack) => {
      if (typeof ack !== 'function') return;
      if (typeof code !== 'string' || !CODE_PATTERN.test(code)) {
        return ack({ ok: false, error: 'Invalid session code' });
      }

      try {
        const session = await deps.getSnapshot(code);
        if (!session) return ack({ ok: false, error: 'Session not found' });

        // One session per socket: leave any previous session room first.
        for (const room of socket.rooms) {
          if (room !== socket.id) socket.leave(room);
        }
        await socket.join(sessionRoom(code));
        const [player, leaderboard] = await Promise.all([
          deps.getPlayer(code, socket.data.userId),
          deps.getLeaderboard(code),
        ]);
        return ack({ ok: true, session, player, leaderboard });
      } catch (e) {
        logger.error('Error in session:subscribe', { error: e instanceof Error ? e.message : e });
        return ack({ ok: false, error: 'Could not load the session' });
      }
    });
  });

  return io;
};
