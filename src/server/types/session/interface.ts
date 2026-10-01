import QuizSession from "@server/models/sql/QuizSession"
import { CreateQuizParticipant, SessionDetailByCode, UserJoinSession } from "./dto"
import QuizParticipant from "@server/models/sql/QuizParticipant"
import type { SessionPlayer, SessionSnapshot } from "@server/types/realtime"

export interface ISessionService {
  createGameSession(name: string | null): Promise<QuizSession>
  getSessionHistory(params: { q?: string, page?: number }):  Promise<{ rows: QuizSession[], count: number }>
  initSession(): Promise<string>
  joinSession(arg: UserJoinSession): Promise<void>
  getSessionDetail(code: string): Promise<SessionDetailByCode>
  startSession(code: string): Promise<void>
  finishSession(code: string): Promise<void>
  getSessionSnapshot(code: string): Promise<SessionSnapshot | null>
  getPlayerInSession(code: string, userId: string): Promise<SessionPlayer>
}

export interface ISessionRepository {
  createSession(name: string | null): Promise<QuizSession>
  listSession(params: { q?: string | null, page?: number }): Promise<{ rows: QuizSession[], count: number }>;
  getSessionByCode(code: string): Promise<QuizSession | null>;
  createUserGameSession(dto: CreateQuizParticipant): Promise<void>;
  getSessionDetailByCode(code: string): Promise<SessionDetailByCode | null>;
  getPlayersSessionDetail(userId: string, quizSessionId: number): Promise<QuizParticipant | null>
  updateSession(id: number, dto: Omit<Partial<QuizSession> , 'id'>): Promise<void>
}
