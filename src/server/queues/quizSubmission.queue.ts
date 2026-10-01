import { Queue } from 'bullmq';
import Connection from '../config/connection';

export const QUIZ_SUBMISSION_QUEUE = 'quiz-submission';

export interface QuizSubmissionJob {
  quizSessionId: number;
  quizQuestionId: number;
  quizParticipantId: number;
  /** Chosen option id, e.g. 'a'. */
  answer: string;
  /** Points awarded for this answer (0 when wrong). */
  score: number;
  /** Participant's running total after this answer, as returned by Redis. */
  totalScore: number;
  answeredAt: string;
}

let queue: Queue<QuizSubmissionJob> | undefined;

export const getQuizSubmissionQueue = (): Queue<QuizSubmissionJob> => {
  queue ??= new Queue<QuizSubmissionJob>(QUIZ_SUBMISSION_QUEUE, {
    connection: Connection.QueueOptions(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 3600, count: 10_000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
  return queue;
};

export const submissionJobId = ({ quizSessionId, quizQuestionId, quizParticipantId }: QuizSubmissionJob) =>
  `submission-${quizSessionId}-${quizQuestionId}-${quizParticipantId}`;

export const enqueueQuizSubmission = (data: QuizSubmissionJob) =>
  getQuizSubmissionQueue().add('persist', data, { jobId: submissionJobId(data) });

export const closeQuizSubmissionQueue = async () => {
  await queue?.close();
  queue = undefined;
};
