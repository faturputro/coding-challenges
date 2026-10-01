import * as dotenv from 'dotenv';

dotenv.config({ path: `${process.cwd()}/.env` });

export const DEV_MODE = process.env.NODE_ENV === "development";

export const APP_PORT = process.env.PORT || 9000;

export const DB_CONFIG = {
  DB_NAME: process.env.DB_NAME,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_PORT: Number(process.env.DB_PORT),
} as const;

export const REDIS_CONFIG = {
  HOST: process.env.REDIS_HOST ?? 'localhost',
  PORT: process.env.REDIS_PORT ?? '6379',
  DB: process.env.REDIS_DB ?? '0',
  PASSWORD: process.env.REDIS_PASSWORD || undefined,
} as const;

export const QUEUE_CONFIG = {
  // Keep at or below the Sequelize pool size (default 5) so jobs don't wait on connections.
  SUBMISSION_WORKER_CONCURRENCY: Number(process.env.SUBMISSION_WORKER_CONCURRENCY ?? 5),
} as const;

export const APP_PKCS8_KEY = process.env.APP_PKCS8_KEY;

export const SESSION_NAME = 'elsasid';

export const DEFAULT_SESSION_DURATION_MINUTE = 120; // FOR TESTING PURPOSE DURATION SHOULD BE SHORTER IN PROD

export const POINTS_PER_CORRECT_ANSWER = 100;


/** Origins allowed to open a Socket.IO connection (comma-separated). */
export const SOCKET_ALLOWED_ORIGINS = (process.env.SOCKET_ALLOWED_ORIGINS
  ?? `http://localhost:5173,http://localhost:${APP_PORT}`)
  .split(',').map((origin) => origin.trim()).filter(Boolean);
