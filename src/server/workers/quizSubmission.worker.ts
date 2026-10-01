import { UnrecoverableError, Worker } from 'bullmq';
import { QueryTypes } from 'sequelize';
import type { Sequelize } from 'sequelize-typescript';
import { QUEUE_CONFIG } from '../config/app.config';
import Connection from '../config/connection';
import { QUIZ_SUBMISSION_QUEUE, type QuizSubmissionJob } from '../queues/quizSubmission.queue';
import { logger } from '../utils/logger';
import { appMetrics } from '../utils/metrics';

const isPositiveInt = (value: unknown) => Number.isInteger(value) && (value as number) > 0;

/** Rejects malformed payloads without retrying, since retries cannot fix them. */
export const assertValidSubmission = (data: QuizSubmissionJob) => {
  const valid = isPositiveInt(data?.quizSessionId)
    && isPositiveInt(data.quizQuestionId)
    && isPositiveInt(data.quizParticipantId)
    && typeof data.answer === 'string' && /^[a-z]$/.test(data.answer)
    && Number.isInteger(data.score) && data.score >= 0
    && Number.isInteger(data.totalScore) && data.totalScore >= 0
    && !Number.isNaN(Date.parse(data.answeredAt));

  if (!valid) throw new UnrecoverableError('Invalid quiz submission payload');
};

/**
 * Idempotent: a retried or duplicated job inserts nothing new, and the summary
 * keeps the highest running total, so out-of-order jobs never lower a score.
 */
export const persistQuizSubmission = async (db: Sequelize, data: QuizSubmissionJob) => {
  assertValidSubmission(data);

  const replacements = { ...data };

  await db.transaction(async (transaction) => {
    await db.query(
      `INSERT INTO quiz_submission
         (quiz_session_id, quiz_question_id, quiz_participant_id, answer, score, created_at, updated_at)
       VALUES (:quizSessionId, :quizQuestionId, :quizParticipantId, :answer, :score, :answeredAt, NOW())
       ON CONFLICT (quiz_session_id, quiz_question_id, quiz_participant_id) DO NOTHING`,
      { replacements, type: QueryTypes.INSERT, transaction },
    );

    await db.query(
      `INSERT INTO quiz_summary (quiz_session_id, quiz_participant_id, score, created_at, updated_at)
       VALUES (:quizSessionId, :quizParticipantId, :totalScore, NOW(), NOW())
       ON CONFLICT (quiz_session_id, quiz_participant_id)
       DO UPDATE SET score = GREATEST(quiz_summary.score, EXCLUDED.score), updated_at = NOW()`,
      { replacements, type: QueryTypes.INSERT, transaction },
    );
  });
};

export const createQuizSubmissionWorker = (db: Sequelize) => {
  const worker = new Worker<QuizSubmissionJob>(
    QUIZ_SUBMISSION_QUEUE,
    async (job) => {
      const startedAt = performance.now();
      await persistQuizSubmission(db, job.data);
      appMetrics.submissionPersistDuration.record(performance.now() - startedAt);
    },
    { connection: Connection.QueueOptions(), concurrency: QUEUE_CONFIG.SUBMISSION_WORKER_CONCURRENCY },
  );

  worker.on('failed', (job, error) => {
    appMetrics.jobsFailed.add(1, { queue: QUIZ_SUBMISSION_QUEUE });
    logger.error('Quiz submission job failed', {
      jobId: job?.id, attemptsMade: job?.attemptsMade, error: error.message,
    });
  });
  worker.on('error', (error) => logger.error('Quiz submission worker error', { error: error.message }));

  return worker;
};
