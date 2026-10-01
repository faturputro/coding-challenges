import { Emitter } from '@socket.io/redis-emitter';
import Connection from '../config/connection';
import type { LeaderboardEntry, ServerToClientEvents, SessionSnapshot, SessionUpdateReason } from '../types/realtime';
import { sessionRoom } from '../types/realtime';

export interface ISessionEvents {
  sessionUpdated(reason: SessionUpdateReason, session: SessionSnapshot): void;
  leaderboardUpdated(code: string, leaderboard: LeaderboardEntry[]): void;
}

/**
 * Publishes through Redis, which every API node's Socket.IO Redis adapter
 * relays to its sockets. Works from any process (API or worker) without
 * holding a Socket.IO server.
 */
export class RedisSessionEvents implements ISessionEvents {
  private emitter: Emitter<ServerToClientEvents> | undefined;

  private getEmitter() {
    this.emitter ??= new Emitter<ServerToClientEvents>(Connection.Redis());
    return this.emitter;
  }

  sessionUpdated(reason: SessionUpdateReason, session: SessionSnapshot) {
    this.getEmitter().to(sessionRoom(session.code)).emit('session:updated', { reason, session });
  }

  leaderboardUpdated(code: string, leaderboard: LeaderboardEntry[]) {
    this.getEmitter().to(sessionRoom(code)).emit('leaderboard:updated', { leaderboard });
  }
}
