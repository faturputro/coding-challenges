import Connection from '@server/config/connection';
import { AppErrorCode } from '@server/types/app';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const limiterMap: Record<string, RateLimitRequestHandler> = {};

export default (max = 100, secondInterval = 60) => {
  const key = `${max}:${secondInterval}`;

  return limiterMap[key] ??= rateLimit({
    store: new RedisStore({
      prefix: `rate-limit:${key}:`,
      // biome-ignore lint/suspicious/noExplicitAny: treated as unknown
      sendCommand: (command: string, ...args: any[]) =>
        // biome-ignore lint/suspicious/noExplicitAny: treated as unknown
        Connection.Redis().call(command, ...args) as Promise<any>,
    }),
    windowMs: secondInterval * 1000,
    max,
    message: 'Too many requests please try again later.',
    handler: (_req, res) => {
      res.status(429).json({
        code: AppErrorCode.TooManyRequests,
        message: 'Too many requests, please try again later.',
      });
    },
  });
};
