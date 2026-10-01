import { NextFunction, Request, Response } from 'express';
import Connection from '@server/config/connection';
import { decryptor } from '@server/utils/jwt';
import { AppErrorCode } from '@server/types/app';
import AppError from '@server/utils/AppError';
import { AdminJWTClaim } from '@server/types/admin';
import { logger } from '@server/utils/logger';

const redis = Connection.Redis();
const err = new AppError({ code: AppErrorCode.Unauthorized, message: 'Unauthorized' });
const invalidToken = new AppError({ code: AppErrorCode.InvalidToken, message: 'Invalid session' });

export default async (req: Request, res: Response, next: NextFunction) => {
  const jwt = req.cookies.adminsid;
  if (!jwt) return res.failed(err);

  // A cookie that can't be decrypted (tampered, or from an old key) is the client's problem: 401, not 500.
  let decrypted: AdminJWTClaim;
  try {
    decrypted = await decryptor<AdminJWTClaim>(jwt, 'admin');
  } catch (e) {
    return res.failed(e instanceof AppError ? e : invalidToken);
  }

  try {
    const cache = await redis.get(`admin_session:${decrypted.id}`);
    if (!cache) {
      return res.failed(err);
    }

    req.user = decrypted;
    return next();
  } catch (e) {
    logger.error('Error in session middleware:', e);
    return res.failed(e);
  }
};
