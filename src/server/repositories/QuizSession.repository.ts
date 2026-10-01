import Connection from "@server/config/connection";
import QuizParticipant from "@server/models/sql/QuizParticipant";
import QuizSession from "@server/models/sql/QuizSession";
import { ISessionRepository, RawSessionDetailByCode, SessionDetailByCode } from "@server/types/session";
import { randomBytes } from 'crypto';
import { Op, QueryTypes, WhereOptions } from "sequelize";

export default class QuizSessionRepository implements ISessionRepository {
  private readonly CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  private generateCode() {
    return Array.from(randomBytes(10), (b) => this.CHARS[b % this.CHARS.length]).join('');
  }

  async createCode() {
    let code = this.generateCode();
    while (await QuizSession.findOne({ where: { code } })) {
      code = this.generateCode();
    }

    return code;
  }

  async createSession(name: string | null) {
    const code = await this.createCode();
    const result = await QuizSession.create({
      name,
      code,
    });

    return result;
  }

  async listSession(params: { q?: string | null, page?: number }) {
    const where: WhereOptions<QuizSession> = {};

    if (params.q) {
      where.name = {
        // using startsWith so query becomes 'search value%' so index is used
        [Op.startsWith]: params.q,
      };
    }
    
    const limit = 10;
    const result = await QuizSession.findAndCountAll({
      where,
      offset: (params.page ?? 0) * limit,
      limit,
      order: [['id', 'DESC']],
    });

    return result;
  }

  async createUserSession(dto: { user_id: string, token: string }) {
    await Connection.Redis().set(`user_session:${dto.user_id}`, dto.token, 'EX', 3600);
  }

  async getPlayersSessionDetail(userId: string, quizSessionId: number) {
    return QuizParticipant.findOne({
      where: {
        user_id: userId,
        quiz_session_id: quizSessionId,
      },
    });

  }

  async createUserGameSession(dto: { username: string, user_id: string, quiz_session_id: number }) {
    await QuizParticipant.create({
      user_id: dto.user_id,
      username: dto.username,
      quiz_session_id: dto.quiz_session_id,
    });
  }

  async getSessionByCode(code: string): Promise<QuizSession | null> {
    if (!code) return null;
    const result = await QuizSession.findOne({
      where: {
        code,
      },
    });
    return result;
  }

  async updateSession(id: number, dto: Omit<Partial<QuizSession> , 'id'>) {
    await QuizSession.update({
      ...dto,
      updated_at: new Date(),
    }, {
      where: {
        id
      },
    });
  }

  async getSessionDetailByCode(code: string): Promise<SessionDetailByCode | null> {
    const result = await Connection.DB().query<RawSessionDetailByCode>(`
      SELECT
        qs.id,
        qs.name,
        qs.status,
        qs.code,
        qs.finished_at,
        qs.started_at,
        qp.user_id,
        qp.username
      FROM quiz_session qs
      LEFT JOIN quiz_participant qp ON qs.id = qp.quiz_session_id
      WHERE qs.code = :code
      `, {
        type: QueryTypes.SELECT,
        replacements: {
          code
        },
      });

    const participants: { user_id: string, username: string }[] = [];

    
    const [row] = result;
    if (!row) return null;

    result.forEach((row) => {
      if (row.user_id) {
        participants.push({ user_id: row.user_id, username: row.username });
      }
    });

    return {
      id: row.id,
      name: row.name,
      status: row.status,
      code: row.code,
      started_at: row.started_at,
      finished_at: row.finished_at,
      participants,
    };
  }
}
