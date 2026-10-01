import redact from 'fast-redact';

/**
 * Fields that must never reach logs: session tokens (cookies hold the player
 * and admin JWEs), credentials and passwords. Paths cover both request logs
 * (`headers`, `body`) and error logs, which nest the request under `metadata`.
 */
export const redactor = redact({
  paths: [
    'password',
    'body.password',
    'metadata.body.password',
    'headers.cookie',
    'headers.authorization',
    'metadata.headers.cookie',
    'metadata.headers.authorization',
    'metadata.headers["set-cookie"]',
  ],
  censor: '**********',
  serialize: false,
});
