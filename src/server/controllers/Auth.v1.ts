import { Controller, Get, Middleware, Post } from "@overnightjs/core";
import isAuthenticated from "@server/middlewares/isAuthenticated";
import rateLimiter from "@server/middlewares/rateLimiter";
import type { IAdminAuthService } from "@server/types/admin";
import { logger } from "@server/utils/logger";
import type { Request, Response } from "express";

@Controller('auth')
export default class AuthControllerV1 {
  constructor(
    private readonly authService: IAdminAuthService,
  ) {}

  @Post('login')
  @Middleware([rateLimiter(5, 60)])
  async login(req: Request, res: Response) {
    try {
      const token = await this.authService.authenticate(req.body.email, req.body.password);
      res.set('Set-Cookie', `adminsid=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; Secure=True;`);
      return res.success();
    } catch (e) {
      logger.error('Error in AuthControllerV1.login:', e);
      return res.failed(e);
    }
  }

  @Get('profile')
  @Middleware([isAuthenticated])
  async getProfile(req: Request, res: Response) {
    try {
      const result = await this.authService.getProfile(req.user.id);
      return res.success({ id: result.id, email: result.email });
    } catch (e) {
      logger.error('Error in AuthControllerV1.getProfile', e);
      return res.failed(e);
    }
  }
}
