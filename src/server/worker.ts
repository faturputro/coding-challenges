import { acquireConnections } from './bootstrap';
import { QUEUE_CONFIG } from './config/app.config';
import { quizSessionService } from './services/services.containers';
import { logger } from './utils/logger';
import { createQuizSubmissionWorker } from './workers/quizSubmission.worker';
import { createSessionLifecycleWorker } from './workers/sessionLifecycle.worker';

(async () => {
  try {
    let isShuttingDown = false;

    // Redis is needed too: finishing a session broadcasts through the Socket.IO Redis emitter.
    const { db, redis } = await acquireConnections();

    const worker = createQuizSubmissionWorker(db);
    const lifecycleWorker = createSessionLifecycleWorker(quizSessionService);
    await Promise.all([worker.waitUntilReady(), lifecycleWorker.waitUntilReady()]);
    logger.info('Workers started', { submissionConcurrency: QUEUE_CONFIG.SUBMISSION_WORKER_CONCURRENCY });

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info('Gracefully shutting down worker...', { signal });

      try {
        // Waits for in-flight jobs; unfinished ones are picked up again on restart.
        await Promise.all([worker.close(), lifecycleWorker.close()]);
        await db.close();
        await redis.quit();
        process.exit(0);
      } catch (e) {
        logger.error('Worker shutdown error: ', e);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (e) {
    logger.error('Worker error: ', e);
    process.exit(1);
  }
})();
