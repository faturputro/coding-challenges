import { NextFunction, Request, Response } from 'express';
import { decryptor } from '@server/utils/jwt';
import { SESSION_NAME } from '@server/config/app.config';
import { AppErrorCode } from '@server/types/app';
import AppError from '@server/utils/AppError';

const invalidToken = new AppError({ code: AppErrorCode.InvalidToken, message: 'Invalid session' });

/** Sets req.user from the player cookie when present; routes decide whether a player is required. */
export default async (req: Request, res: Response, next: NextFunction) => {
  const jwt = req.cookies[SESSION_NAME];
  if (!jwt) return next();

  try {
    req.user = await decryptor<{ user_id: string }>(jwt, 'player');
    return next();
  } catch (e) {
    // Tampered or undecryptable cookie: 401 so the client can get a fresh one from /session/init.
    return res.failed(e instanceof AppError ? e : invalidToken);
  }
};
