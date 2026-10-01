/** One option of a question as stored in `quiz_question.choices`. */
export type QuizChoice = {
  id: string;
  label: string;
  is_correct: boolean;
};

export type QuizQuestionRecord = {
  id: number;
  question: string;
  choices: QuizChoice[];
};

/** What players receive: the correct flag is never sent before they answer. */
export type PublicQuizQuestion = {
  id: number;
  question: string;
  choices: Array<Pick<QuizChoice, 'id' | 'label'>>;
};

export type PlayerQuestions = {
  questions: PublicQuizQuestion[];
  /** Choices this player already submitted, by question id (for resuming after a refresh). */
  answers: Record<string, string>;
  total_score: number;
  finished_at: string | null;
};

export type SubmitAnswerDto = {
  code: string;
  user_id: string;
  question_id: unknown;
  answer: unknown;
};

export type AnswerResult = {
  correct: boolean;
  points: number;
  total_score: number;
  /** Revealed after answering so the player learns the right word. */
  correct_answer: string;
};

export type RecordAnswerDto = {
  sessionId: number;
  participantId: number;
  /** Stored alongside the score so the leaderboard never needs a DB lookup. */
  username: string;
  questionId: number;
  answer: string;
  points: number;
  /** When the session's Redis state may be dropped. */
  expireAt: Date;
};

export type RecordAnswerResult =
  | { recorded: true; totalScore: number }
  | { recorded: false; previousAnswer: string; totalScore: number };

/** One leaderboard row as stored in Redis. */
export type LeaderboardScore = {
  player_id: number;
  username: string;
  score: number;
};
