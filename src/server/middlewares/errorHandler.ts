import type { ErrorRequestHandler, Response } from 'express';
import { v7 as uuidv7 } from 'uuid';
import { AppErrorCode } from '../types/app';
import AppError from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Body-parser errors happen before the request-logging and response middleware
 * run, so `res.failed` and the request context don't exist yet. Answer those
 * with the standard envelope directly.
 */
const failEarly = (res: Response, status: number, message: string) => {
  const requestId = uuidv7();
  logger.warn(`${status} ${message}`, { request_id: requestId });
  return res.status(status).json({
    success: false,
    code: AppErrorCode.BadRequest,
    message,
    request_id: requestId,
    timestamp: Date.now(),
    data: null,
  });
};

const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);

  if (error?.type === 'entity.parse.failed') return failEarly(res, 400, 'Invalid JSON body');
  if (error?.type === 'entity.too.large') return failEarly(res, 413, 'Request body too large');

  if (typeof res.failed !== 'function') {
    logger.error('Unhandled error before response middleware', { error: error instanceof Error ? error.message : error });
    return res.status(500).json({ success: false, code: AppErrorCode.InternalServerError, request_id: uuidv7(), timestamp: Date.now(), data: null });
  }

  return res.failed(error instanceof Error ? error : new AppError({}));
};

export default errorHandler;
