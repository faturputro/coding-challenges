import http from 'node:http';

import { acquireConnections } from './bootstrap';
import { createAdapter } from '@socket.io/redis-adapter';
import { APP_PORT, SESSION_NAME, SOCKET_ALLOWED_ORIGINS } from './config/app.config';
import { closeQuizSubmissionQueue } from './queues/quizSubmission.queue';
import { closeSessionLifecycleQueue } from './queues/sessionLifecycle.queue';
import { createSocketServer } from './realtime/socket';
import App from './server';
import { leaderboardService, quizSessionService } from './services/services.containers';
import { decryptor } from './utils/jwt';
import { logger } from './utils/logger';

(async () => {
  try {
    let isShuttingDown = false;

    const { db, redis } = await acquireConnections();
    const env = process.env.NODE_ENV;

    const { app } = new App();
    app.set('port', APP_PORT);

    const server = http.createServer(app);

    // Dedicated pub/sub connections: a subscribed Redis client can't run other commands.
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    const io = createSocketServer(server, {
      playerCookie: SESSION_NAME,
      verifyPlayer: async (token) => (await decryptor<{ user_id: string }>(token, 'player')).user_id,
      getSnapshot: (code) => quizSessionService.getSessionSnapshot(code),
      getPlayer: (code, userId) => quizSessionService.getPlayerInSession(code, userId),
      getLeaderboard: (code) => leaderboardService.getLeaderboardByCode(code),
      allowedOrigins: SOCKET_ALLOWED_ORIGINS,
      adapter: createAdapter(pubClient, subClient),
    });

    server.listen(APP_PORT);

    server.on('listening', () => {
      console.log(`\nDB\t: OK\nRedis\t: OK\nEnv\t: ${env}\nAddress\t: http://localhost:${APP_PORT}`);
    });

    const shutdown = (signal: string) => {
      if (!isShuttingDown) {
        logger.info('Gracefully shutting down...');
        isShuttingDown = true;
        const exitCode = signal === 'uncaughtException' ? 1 : 0;

        // Disconnects sockets and closes the HTTP server; open WebSockets would otherwise keep it alive.
        io.close(async () => {
          await closeQuizSubmissionQueue();
          await closeSessionLifecycleQueue();
          await Promise.all([pubClient.quit(), subClient.quit()]);
          await db.close();
          await redis.quit();

          setTimeout(() => {
            process.exit(exitCode);
          }, 3000);
        });
      }
    }

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (e) {
    console.log(e);
    logger.error('Server error: ', e);
    process.exit(1);
  }
})();
