import path from 'node:path';
import { Server } from '@overnightjs/core';
import express from 'express';
import '@server/utils/AppValidator';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import logRequest from './middlewares/logRequest';
import response from './middlewares/response';
import errorHandler from './middlewares/errorHandler';
import AppError from './utils/AppError';
import { AppErrorCode } from './types/app';
import ControllerV1 from './controllers';
import { DEV_MODE } from './config/app.config';

export default class App extends Server {
  constructor() {
    super(DEV_MODE);

    this.app.set('trust proxy', 1);
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          // The browser RUM SDK sends events straight to OpenObserve.
          connectSrc: ["'self'", ...(process.env.OPENOBSERVE_URL ? [process.env.OPENOBSERVE_URL] : [])],
        },
      },
    }));
    this.app.use(cookieParser());
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    this.app.use((_req, res, next) => {
			res.removeHeader('X-Powered-By');
			next();
		});

    this.app.use(logRequest);
    this.app.use(response);

    super.addControllers([
      new ControllerV1(),
    ]);

    this.start();
    this.app.use(errorHandler);
  }

  public start() {
    this.app.get('/healthcheck', (_req, res) => {
      res.success({ status: 'OK' });
    });

    this.app.use('/api', (_req, res) => {
      res.failed(new AppError({ code: AppErrorCode.NotFound, message: 'Not found' }));
    });

    const baseStaticPath = path.join(__dirname, '..', 'client');
		this.app.use(express.static(baseStaticPath));
		this.app.use('*', (_req, res) => res.sendFile(path.join(baseStaticPath, 'index.html')));
  }
}

export const app = new App().app;
