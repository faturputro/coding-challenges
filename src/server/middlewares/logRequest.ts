import { DEV_MODE } from '@server/config/app.config';
import context from '@server/types/context';
import { logger } from '@server/utils/logger';
import type { NextFunction, Request, Response } from 'express';
import { v7 as uuidv7 } from 'uuid';

export default (req: Request, _res: Response, next: NextFunction) => {
  const requestId = uuidv7();
  const timestamp = new Date().toISOString();

  const payload = {
    request_id: requestId,
    timestamp,
    timezone: req.headers['x-timezone'] as string ?? 'UTC',
    headers: {
      'user-agent': req.headers['user-agent'],
      'origin': req.headers['origin'],
      cookie: req.headers.cookie,
      host: req.headers.host,
      referrer: req.headers.referer,
      accept: req.headers.accept,
      'accept-language': req.headers['accept-language'],
    },
    ...(Object.keys(req.body).length ? { body: {...req.body} } : {}),
    ...(Object.keys(req.query).length ? { query: {...req.query} } : {}),
    ...(Object.keys(req.params).length ? { params: {...req.params} } : {}),
  };

  logger.info(`${req.method} ${req.path}`, DEV_MODE ? JSON.stringify(payload, null, 2) : payload);

  context.run({
    user: {
      id: 0,
      email: '',
    },
  }, () => next());
};
