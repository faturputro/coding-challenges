import type { ISessionEvents } from "@server/realtime/sessionEvents";
import type { IQuizAnswerRepository, LeaderboardScore } from "@server/types/quiz";
import type { LeaderboardEntry } from "@server/types/realtime";
import type { ISessionRepository } from "@server/types/session";
import { logger } from "@server/utils/logger";
import { appMetrics } from "@server/utils/metrics";

export interface ILeaderboardService {
  getLeaderboard(sessionId: number): Promise<LeaderboardEntry[]>;
  getLeaderboardByCode(code: string): Promise<LeaderboardEntry[]>;
  addPlayer(session: { id: number; code: string }, participantId: number, username: string): Promise<void>;
  /** Signals that scores changed; broadcasts are throttled per session. */
  scoreChanged(session: { id: number; code: string }): void;
}

/** Competition ranking: equal scores share a rank and the next rank skips (1, 1, 3). */
export const rankScores = (scores: LeaderboardScore[]): LeaderboardEntry[] => {
  let rank = 0;
  return scores.map((row, i) => {
    if (i === 0 || row.score !== scores[i - 1].score) rank = i + 1;
    return { rank, ...row };
  });
};

export default class LeaderboardService implements ILeaderboardService {
  /** Sessions inside a throttle window; `dirty` means another broadcast is owed when it ends. */
  private readonly windows = new Map<number, { dirty: boolean }>();

  constructor(
    private readonly sessionRepo: Pick<ISessionRepository, 'getSessionByCode'>,
    private readonly answerRepo: Pick<IQuizAnswerRepository, 'addPlayer' | 'getTopScores'>,
    private readonly sessionEvents: Pick<ISessionEvents, 'leaderboardUpdated'>,
    private readonly options: { size: number; throttleMs: number } = { size: 10, throttleMs: 500 },
  ) {}

  async getLeaderboard(sessionId: number) {
    return rankScores(await this.answerRepo.getTopScores(sessionId, this.options.size));
  }

  async getLeaderboardByCode(code: string) {
    const session = await this.sessionRepo.getSessionByCode(code);
    return session ? this.getLeaderboard(session.id) : [];
  }

  async addPlayer(session: { id: number; code: string }, participantId: number, username: string) {
    await this.answerRepo.addPlayer(session.id, participantId, username);
    this.scoreChanged(session);
  }

  /**
   * Leading edge broadcasts immediately; changes during the window are merged
   * into one trailing broadcast. A burst of answers costs at most one
   * broadcast per window instead of one per answer.
   */
  scoreChanged(session: { id: number; code: string }) {
    const window = this.windows.get(session.id);
    if (window) {
      window.dirty = true;
      return;
    }

    this.windows.set(session.id, { dirty: false });
    void this.broadcast(session);

    const timer = setTimeout(() => {
      const ended = this.windows.get(session.id);
      this.windows.delete(session.id);
      if (ended?.dirty) this.scoreChanged(session);
    }, this.options.throttleMs);
    // Never keep the process alive just to send a leaderboard.
    timer.unref?.();
  }

  private async broadcast(session: { id: number; code: string }) {
    try {
      this.sessionEvents.leaderboardUpdated(session.code, await this.getLeaderboard(session.id));
      appMetrics.leaderboardBroadcasts.add(1);
    } catch (e) {
      logger.error('Failed to broadcast leaderboard', { sessionId: session.id, error: e instanceof Error ? e.message : e });
    }
  }
}
