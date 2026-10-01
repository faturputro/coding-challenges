import { AppErrorCode } from '@server/types/app';
import { logger } from './logger';

interface AppErrorOptions {
  message?: string;
  code?: AppErrorCode;
  data?: unknown | null;
}

export default class AppError extends Error {
  message: string;
  code?: AppErrorCode;
  data?: unknown;

  constructor({ message, code, data }: AppErrorOptions) {
    super();
    const errCode = code || AppErrorCode.InternalServerError;
    this.message = message || 'Something went wrong...';
    this.code = code;
    this.data = data;

    if (process.env.NODE_ENV !== 'development') {
      logger.error(`ERR CODE: ${String(errCode)}`, { errors: data });
    }
  }
}
