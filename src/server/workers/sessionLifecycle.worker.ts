import { Worker } from 'bullmq';
import Connection from '../config/connection';
import { SESSION_LIFECYCLE_QUEUE, type FinishSessionJob } from '../queues/sessionLifecycle.queue';
import { logger } from '../utils/logger';
import { appMetrics } from '../utils/metrics';

export interface SessionFinisher {
  finishSession(code: string): Promise<void>;
}

export const createSessionLifecycleWorker = (sessions: SessionFinisher) => {
  const worker = new Worker<FinishSessionJob>(
    SESSION_LIFECYCLE_QUEUE,
    (job) => sessions.finishSession(job.data.code),
    { connection: Connection.QueueOptions() },
  );

  worker.on('failed', (job, error) => {
    appMetrics.jobsFailed.add(1, { queue: SESSION_LIFECYCLE_QUEUE });
    logger.error('Session lifecycle job failed', { jobId: job?.id, attemptsMade: job?.attemptsMade, error: error.message });
  });
  worker.on('error', (error) => logger.error('Session lifecycle worker error', { error: error.message }));

  return worker;
};
