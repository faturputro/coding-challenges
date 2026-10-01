import { Controller, Get, Middleware, Post, Put } from "@overnightjs/core";
import { SESSION_NAME } from "@server/config/app.config";
import isAuthenticated from "@server/middlewares/isAuthenticated";
import type { ISessionService } from "@server/types/session";
import { decryptor } from "@server/utils/jwt";
import { logger } from "@server/utils/logger";
import type { Request, Response } from "express";

@Controller('session')
export default class QuizSessionControllerV1 {
  constructor(
    private readonly sessionService: ISessionService,
  ) {}

  @Post()
  @Middleware([isAuthenticated])
  async createSession(req: Request, res: Response) {
    try {
      const result = await this.sessionService.createGameSession(req.body.name);

      return res.success({
        code: result.code,
        name: result.name,
        status: result.status,
      });
    } catch (e) {
      logger.error('Error in QuizSessionControllerV1.createSession: ', e);
      return res.failed(e);
    }
  }

  @Get('init')
  async createUserSessionId(req: Request, res: Response) {
    try {
      // Keep a valid cookie; replace a missing, expired or undecryptable one so the player isn't stuck.
      const existing = req.cookies[SESSION_NAME];
      if (existing && await decryptor(existing, 'player').then(() => true, () => false)) return res.success();

      const token = await this.sessionService.initSession();
      res.set('Set-Cookie', `${SESSION_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 365}; Secure=True;`);
      return res.success();
    } catch (e) {
      logger.error('Error in QuizSessionControllerV1.createUserSessionId: ', e);
      return res.failed(e);
    }
  }

  @Get()
  @Middleware([isAuthenticated])
  async getHistory(req: Request, res: Response) {
    try {
      const result = await this.sessionService.getSessionHistory({ ...req.query });
      return res.success({
        total: result.count,
        data: result.rows.map((row) => ({
          code: row.code,
          name: row.name,
          status: row.status,
          created_at: row.created_at,
        })),
      });
    } catch (e) {
      logger.error('Error in QuizSessionControllerV1.getHistory: ', e);
      return res.failed(e);
    }
  }

  @Put(':code/start')
  @Middleware([isAuthenticated])
  async startSession(req: Request, res: Response) {
    try {
      await this.sessionService.startSession(req.params.code);
      return res.success();
    } catch (e) {
      logger.error('Error in QuizSessionControllerV1.startSession: ', e);
      return res.failed(e);
    }
  }
}
