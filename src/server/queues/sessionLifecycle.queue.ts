import { Queue } from 'bullmq';
import Connection from '../config/connection';

export const SESSION_LIFECYCLE_QUEUE = 'session-lifecycle';

export interface FinishSessionJob {
  code: string;
}

export interface ISessionScheduler {
  scheduleFinish(code: string, at: Date): Promise<void>;
}

let queue: Queue<FinishSessionJob> | undefined;

const getQueue = (): Queue<FinishSessionJob> => {
  queue ??= new Queue<FinishSessionJob>(SESSION_LIFECYCLE_QUEUE, {
    connection: Connection.QueueOptions(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
  return queue;
};

/**
 * Finishes sessions with a delayed job instead of an in-process timer, so the
 * deadline survives API restarts and fires exactly once across nodes.
 */
export class QueueSessionScheduler implements ISessionScheduler {
  async scheduleFinish(code: string, at: Date) {
    await getQueue().add('finish', { code }, {
      jobId: `finish-${code}`,
      delay: Math.max(0, at.getTime() - Date.now()),
    });
  }
}

export const closeSessionLifecycleQueue = async () => {
  await queue?.close();
  queue = undefined;
};
