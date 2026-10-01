import { GameStatus } from "@server/config/const";

export type CreateQuizParticipant = {
  username: string;
  user_id: string;
  quiz_session_id: number;
}

export type UserJoinSession = {
  user_id: string
  username: string
  code: string
}

export type RawSessionDetailByCode = {
  id: number
  name: string | null;
  status: GameStatus;
  code: string;
  finished_at: string | null;
  started_at: string | null;
  user_id: string;
  username: string;
}

export type SessionDetailByCode = {
  id: number
  name: string | null;
  status: GameStatus;
  code: string;
  finished_at: string | null;
  started_at: string | null;
  participants: Array<{ user_id: string, username: string }>
}
