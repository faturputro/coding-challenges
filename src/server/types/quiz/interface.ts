import type {
  AnswerResult, LeaderboardScore, PlayerQuestions, QuizQuestionRecord, RecordAnswerDto, RecordAnswerResult, SubmitAnswerDto,
} from './dto';

export interface IQuizQuestionRepository {
  listQuestions(): Promise<QuizQuestionRecord[]>;
  getQuestion(id: number): Promise<QuizQuestionRecord | null>;
}

export interface IQuizAnswerRepository {
  /** Atomically records the first answer per question and adds its points. */
  recordAnswer(dto: RecordAnswerDto): Promise<RecordAnswerResult>;
  getAnswers(sessionId: number, participantId: number): Promise<Record<string, string>>;
  getScore(sessionId: number, participantId: number): Promise<number>;
  /** Puts a newly joined player on the leaderboard with 0 points (no-op if already there). */
  addPlayer(sessionId: number, participantId: number, username: string): Promise<void>;
  /** Highest scores first. */
  getTopScores(sessionId: number, limit: number): Promise<LeaderboardScore[]>;
}

export interface IQuizPlayService {
  getQuestions(code: string, userId: string): Promise<PlayerQuestions>;
  submitAnswer(dto: SubmitAnswerDto): Promise<AnswerResult>;
}
