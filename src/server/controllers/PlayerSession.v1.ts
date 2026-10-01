import { Controller, Get, Middleware, Post } from "@overnightjs/core";
import playerSession from "@server/middlewares/playerSession";
import { AppErrorCode } from "@server/types/app";
import type { IQuizPlayService } from "@server/types/quiz";
import type { ISessionService } from "@server/types/session";
import AppError from "@server/utils/AppError";
import { logger } from "@server/utils/logger";
import type { Request, Response } from "express";

@Controller('play')
export default class PlayerSessionControllerV1 {
  constructor(
    private readonly sessionService: ISessionService,
    private readonly quizPlayService: IQuizPlayService,
  ) {}

  /** playerSession lets cookie-less requests through, so playing endpoints check explicitly. */
  private playerId(req: Request): string {
    const userId = req.user?.user_id;
    if (!userId) throw new AppError({ code: AppErrorCode.Unauthorized, message: 'Unauthorized' });
    return userId;
  }

  @Get(':code')
  async getGameInfo(req: Request, res: Response) {
    try {
      const { participants, ...detail } = await this.sessionService.getSessionDetail(req.params.code);
      // Public endpoint: show who's playing, but never the players' user ids.
      return res.success({ ...detail, participants: participants.map(({ username }) => ({ username })) });
    } catch (e) {
      logger.error('Error in PlayerSessionControllerV1.getGameInfo', e);
      return res.failed(e);
    }
  }

  @Post(':code/join')
  @Middleware([playerSession])
  async joinSession(req: Request, res: Response) {
    try {
      await this.sessionService.joinSession({
        code: req.params.code,
        username: req.body.username,
        user_id: req.user.user_id,
      });

      return res.success();
    } catch (e) {
      logger.error('Error in PlayerSessionControllerV1.joinSession', e);
      return res.failed(e);
    }
  }

  @Get(':code/questions')
  @Middleware([playerSession])
  async getQuestions(req: Request, res: Response) {
    try {
      const result = await this.quizPlayService.getQuestions(req.params.code, this.playerId(req));
      return res.success(result);
    } catch (e) {
      logger.error('Error in PlayerSessionControllerV1.getQuestions', e);
      return res.failed(e);
    }
  }

  @Post(':code/questions/:questionId/answer')
  @Middleware([playerSession])
  async submitAnswer(req: Request, res: Response) {
    try {
      const result = await this.quizPlayService.submitAnswer({
        code: req.params.code,
        user_id: this.playerId(req),
        question_id: req.params.questionId,
        answer: req.body?.answer,
      });
      return res.success(result);
    } catch (e) {
      logger.error('Error in PlayerSessionControllerV1.submitAnswer', e);
      return res.failed(e);
    }
  }
}
