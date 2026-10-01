import winston from 'winston';
import { redactor } from '../redactor';
import OpenTelemetryTransport from './OpenTelemetryTransport';

const DEV_MODE = process.env.NODE_ENV === 'development';

const cloneValue = (value: unknown) =>
  value !== null && typeof value === 'object' && !(value instanceof Error) ? JSON.parse(JSON.stringify(value)) : value;

/**
 * Redacts secrets before any transport sees them. Works on a copy, because the
 * logged objects are often live request data (e.g. `req.body`) that must not be
 * modified. `Object.assign` keeps winston's internal symbol keys.
 */
const redactSecrets = winston.format((info) => {
  const copy = Object.assign({}, info);
  for (const key of Object.keys(copy)) copy[key] = cloneValue(copy[key]);
  redactor(copy);
  return copy;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(redactSecrets(), winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    // Ships logs to OpenObserve, correlated with the active trace. A no-op until
    // instrumentation.ts registers the OpenTelemetry SDK (never in development).
    ...(DEV_MODE ? [] : [new OpenTelemetryTransport()]),
  ],
});
