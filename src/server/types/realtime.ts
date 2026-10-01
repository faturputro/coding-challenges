/**
 * Socket.IO contract shared by the server and the Vue client (type-only import
 * on the client via `@server/types/realtime`). Keep it free of runtime imports.
 */

export type SessionStatus = 'not_started' | 'in_progress' | 'finished';

/** Public view of a session; safe to broadcast (no player ids). */
export interface SessionSnapshot {
  code: string;
  name: string | null;
  status: SessionStatus;
  started_at: string | null;
  finished_at: string | null;
  total_players: number;
}

/** Why a snapshot was broadcast, so clients can react to transitions. */
export type SessionUpdateReason = 'player_joined' | 'started' | 'finished';

/** This connection's player in the session, or null if they haven't joined yet. */
export type SessionPlayer = { id: number; username: string } | null;

/** One leaderboard row. Equal scores share a rank (1, 1, 3). */
export interface LeaderboardEntry {
  rank: number;
  player_id: number;
  username: string;
  score: number;
}

export type SubscribeAck =
  | { ok: true; session: SessionSnapshot; player: SessionPlayer; leaderboard: LeaderboardEntry[] }
  | { ok: false; error: string };

export interface ServerToClientEvents {
  'session:updated': (payload: { reason: SessionUpdateReason; session: SessionSnapshot }) => void;
  /** Top of the leaderboard; sent at most every few hundred ms per session. */
  'leaderboard:updated': (payload: { leaderboard: LeaderboardEntry[] }) => void;
}

export interface ClientToServerEvents {
  'session:subscribe': (code: string, ack: (result: SubscribeAck) => void) => void;
}

export interface SocketData {
  userId: string;
}

export const sessionRoom = (code: string) => `session:${code}`;
