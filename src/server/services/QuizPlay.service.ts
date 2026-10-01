import dayjs from "dayjs";
import { GameStatus } from "@server/config/const";
import { POINTS_PER_CORRECT_ANSWER } from "@server/config/app.config";
import type { QuizSubmissionJob } from "@server/queues/quizSubmission.queue";
import type { ILeaderboardService } from "@server/services/Leaderboard.service";
import { AppErrorCode } from "@server/types/app";
import type {
  AnswerResult, IQuizAnswerRepository, IQuizPlayService, IQuizQuestionRepository, PlayerQuestions, SubmitAnswerDto,
} from "@server/types/quiz";
import type { ISessionRepository } from "@server/types/session";
import AppError from "@server/utils/AppError";
import { logger } from "@server/utils/logger";
import { appMetrics } from "@server/utils/metrics";

/** Redis state outlives the session by a day so late reads (results, retries) still work. */
const STATE_RETENTION_DAYS = 1;

export default class QuizPlayService implements IQuizPlayService {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly questionRepo: IQuizQuestionRepository,
    private readonly answerRepo: IQuizAnswerRepository,
    private readonly enqueueSubmission: (job: QuizSubmissionJob) => Promise<unknown>,
    private readonly leaderboard: Pick<ILeaderboardService, 'scoreChanged'>,
  ) {}

  /** The session must be running and the caller must have joined it. */
  private async getRunningSession(code: string, userId: string) {
    const session = await this.sessionRepo.getSessionByCode(code);
    if (!session) {
      throw new AppError({ code: AppErrorCode.NotFound, message: 'Invalid link or expired' });
    }

    const ended = session.status === GameStatus.Finished
      || (!!session.finished_at && !dayjs().isBefore(session.finished_at));
    if (ended) {
      throw new AppError({ code: AppErrorCode.Conflict, message: 'The quiz has ended' });
    }
    if (session.status !== GameStatus.InProgress) {
      throw new AppError({ code: AppErrorCode.Conflict, message: 'The quiz has not started yet' });
    }

    const participant = await this.sessionRepo.getPlayersSessionDetail(userId, session.id);
    if (!participant) {
      throw new AppError({ code: AppErrorCode.Forbidden, message: 'Join the game before playing' });
    }

    return { session, participant };
  }

  async getQuestions(code: string, userId: string): Promise<PlayerQuestions> {
    const { session, participant } = await this.getRunningSession(code, userId);

    const [questions, answers, totalScore] = await Promise.all([
      this.questionRepo.listQuestions(),
      this.answerRepo.getAnswers(session.id, participant.id),
      this.answerRepo.getScore(session.id, participant.id),
    ]);

    return {
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        choices: q.choices.map(({ id, label }) => ({ id, label })),
      })),
      answers,
      total_score: totalScore,
      finished_at: session.finished_at ? new Date(session.finished_at).toISOString() : null,
    };
  }

  async submitAnswer(dto: SubmitAnswerDto): Promise<AnswerResult> {
    const questionId = Number(dto.question_id);
    const answer = typeof dto.answer === 'string' ? dto.answer.trim().toLowerCase() : '';
    if (!Number.isInteger(questionId) || questionId <= 0 || !/^[a-z]$/.test(answer)) {
      throw new AppError({
        code: AppErrorCode.ValidationFailed,
        message: 'Please check your input',
        data: { answer: ['Choose one of the options.'] },
      });
    }

    const { session, participant } = await this.getRunningSession(dto.code, dto.user_id);

    const question = await this.questionRepo.getQuestion(questionId);
    if (!question) {
      throw new AppError({ code: AppErrorCode.NotFound, message: 'Question not found' });
    }

    const choice = question.choices.find((c) => c.id === answer);
    if (!choice) {
      throw new AppError({
        code: AppErrorCode.ValidationFailed,
        message: 'Please check your input',
        data: { answer: ['Choose one of the options.'] },
      });
    }

    // Scored on the server only; the client never decides correctness or points.
    const points = choice.is_correct ? POINTS_PER_CORRECT_ANSWER : 0;
    const correctAnswer = question.choices.find((c) => c.is_correct)?.id ?? '';
    const answeredAt = new Date();

    const result = await this.answerRepo.recordAnswer({
      sessionId: session.id,
      participantId: participant.id,
      username: participant.username,
      questionId,
      answer,
      points,
      expireAt: dayjs(session.finished_at ?? answeredAt).add(STATE_RETENTION_DAYS, 'day').toDate(),
    });

    if (!result.recorded) {
      appMetrics.answersRejected.add(1, { reason: 'duplicate' });
      throw new AppError({
        code: AppErrorCode.Conflict,
        message: 'You already answered this question',
        data: { answer: result.previousAnswer, total_score: result.totalScore },
      });
    }

    appMetrics.answersSubmitted.add(1, { correct: choice.is_correct });
    this.leaderboard.scoreChanged(session);

    // Redis already holds the score; the database copy is written asynchronously by the worker.
    try {
      await this.enqueueSubmission({
        quizSessionId: session.id,
        quizQuestionId: questionId,
        quizParticipantId: participant.id,
        answer,
        score: points,
        totalScore: result.totalScore,
        answeredAt: answeredAt.toISOString(),
      });
    } catch (e) {
      // The player's score is already counted; losing the durable copy must not fail their answer.
      logger.error('Failed to enqueue quiz submission', {
        sessionId: session.id, participantId: participant.id, questionId, error: e instanceof Error ? e.message : e,
      });
    }

    return {
      correct: choice.is_correct,
      points,
      total_score: result.totalScore,
      correct_answer: correctAnswer,
    };
  }
}
