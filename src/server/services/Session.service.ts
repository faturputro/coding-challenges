import type { ISessionRepository, ISessionService, UserJoinSession } from "@server/types/session";
import AppError from '@server/utils/AppError';
import { AppErrorCode } from '@server/types/app';
import { v7 as uuidv7 } from 'uuid';
import { encryptor } from '@server/utils/jwt';
import { IRedisRepository } from '@server/types/redis.interface';
import AppValidator from "@server/utils/AppValidator";
import { appMetrics } from "@server/utils/metrics";
import dayjs from "dayjs";
import { GameStatus } from "@server/config/const";
import { DEFAULT_SESSION_DURATION_MINUTE } from "@server/config/app.config";
import type { ISessionEvents } from "@server/realtime/sessionEvents";
import type { ISessionScheduler } from "@server/queues/sessionLifecycle.queue";
import type { ILeaderboardService } from "@server/services/Leaderboard.service";
import type { SessionPlayer, SessionSnapshot } from "@server/types/realtime";
import type { SessionDetailByCode } from "@server/types/session";

const toIso = (value: Date | string | null) => (value ? new Date(value).toISOString() : null);

/** Public, broadcast-safe view of a session: player ids are never included. */
const toSnapshot = (session: SessionDetailByCode): SessionSnapshot => ({
  code: session.code,
  name: session.name,
  status: session.status,
  started_at: toIso(session.started_at),
  finished_at: toIso(session.finished_at),
  total_players: session.participants.length,
});

export default class QuizSessionService implements ISessionService {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly redisRepo: IRedisRepository,
    private readonly sessionEvents: ISessionEvents,
    private readonly sessionScheduler: ISessionScheduler,
    private readonly leaderboard: Pick<ILeaderboardService, 'addPlayer'>,
  ) {}

  /** Re-reads the session so every broadcast carries the committed state. */
  private async publishUpdate(code: string, reason: 'player_joined' | 'started' | 'finished') {
    const snapshot = await this.getSessionSnapshot(code);
    if (snapshot) this.sessionEvents.sessionUpdated(reason, snapshot);
  }

  async getPlayerInSession(code: string, userId: string): Promise<SessionPlayer> {
    const session = await this.sessionRepo.getSessionByCode(code);
    if (!session) return null;
    const player = await this.sessionRepo.getPlayersSessionDetail(userId, session.id);
    return player ? { id: player.id, username: player.username } : null;
  }

  async getSessionSnapshot(code: string): Promise<SessionSnapshot | null> {
    const session = await this.sessionRepo.getSessionDetailByCode(code);
    return session ? toSnapshot(session) : null;
  }

  async createGameSession(name: string | null) {
    const validator = new AppValidator({ name }, {
      name: 'max:50',
    });

    if (validator.fails()) {
      throw new AppError({
        code: AppErrorCode.ValidationFailed,
        message: 'Please check your input',
        data: validator.errors.all(),
      });
    }

    return this.sessionRepo.createSession(name);
  }

  async initSession() {
    const token = await encryptor({ user_id: uuidv7() }, 1, 'year');
    return token;
  }

  async getSessionHistory(params: { q?: string, page?: number }) {
    let page = 0;

    if (Number(params.page) >= 1) {
      page = Number(params.page) - 1;
    }

    const result = await this.sessionRepo.listSession({ ...params, page });
    return result;
  }

  async getSessionDetail(code: string) {
    const session = await this.sessionRepo.getSessionDetailByCode(code);
    if (!session) {
      throw new AppError({
        code: AppErrorCode.BadRequest,
        message: 'Invalid link or expired',
      });
    }

    return session;
  }

  async joinSession(dto: UserJoinSession): Promise<void> {
    const validator = new AppValidator(dto, {
      code: 'required',
      user_id: 'required|isUUIDV7',
      username: 'required|max:50',
    });

    if (validator.fails()) {
      throw new AppError({
        code: AppErrorCode.ValidationFailed,
        message: 'Please check your input',
        data: validator.errors.all(),
      });
    }

    const quizSession = await this.sessionRepo.getSessionByCode(dto.code);
    if (!quizSession) {
      throw new AppError({
        code: AppErrorCode.NotFound,
        message: 'Invalid link or expired'
      });
    }

    const isJoined = await this.sessionRepo.getPlayersSessionDetail(dto.user_id, quizSession.id);

    if (!isJoined) {
      await Promise.all([
        this.sessionRepo.createUserGameSession({
          user_id: dto.user_id,
          username: dto.username,
          quiz_session_id: quizSession.id,
        }),
        this.redisRepo.set(`player_session:${dto.user_id}`, JSON.stringify({ id: dto.user_id, username: dto.username }), 1, 'year'),
      ]);

      // List the new player (with 0 points) so the lobby shows who's in before anyone scores.
      const participant = await this.sessionRepo.getPlayersSessionDetail(dto.user_id, quizSession.id);
      if (participant) await this.leaderboard.addPlayer(quizSession, participant.id, participant.username);

      appMetrics.playersJoined.add(1);
      await this.publishUpdate(quizSession.code, 'player_joined');
    }
  }

  async startSession(code: string) {
    const session = await this.sessionRepo.getSessionDetailByCode(code);
    if (!session) {
      throw new AppError({
        code: AppErrorCode.BadRequest,
        message: 'Session not found'
      });
    }

    if (!session.participants.length) {
      throw new AppError({
        code: AppErrorCode.BadRequest,
        message: 'No players found',
      });
    }

    if (session.started_at) {
      throw new AppError({
        code: AppErrorCode.BadRequest,
        message: 'Session already started',
      });
    }

    if (session.finished_at && dayjs(session.finished_at).isBefore(dayjs())) {
      throw new AppError({
        code: AppErrorCode.BadRequest,
        message: 'Session already finished',
      });
    }

    const finishedAt = dayjs().add(DEFAULT_SESSION_DURATION_MINUTE, 'minutes').toDate();
    await this.sessionRepo.updateSession(session.id, {
      started_at: new Date(),
      status: GameStatus.InProgress,
      finished_at: finishedAt,
    });

    appMetrics.sessionsStarted.add(1);
    await this.sessionScheduler.scheduleFinish(session.code, finishedAt);
    await this.publishUpdate(session.code, 'started');
  }

  async finishSession(code: string) {
    const session = await this.sessionRepo.getSessionByCode(code);
    if (!session || session.status !== GameStatus.InProgress) return;
    if (session.finished_at && dayjs(session.finished_at).isAfter(dayjs())) return;

    await this.sessionRepo.updateSession(session.id, { status: GameStatus.Finished });
    appMetrics.sessionsFinished.add(1);
    await this.publishUpdate(code, 'finished');
  }
}
