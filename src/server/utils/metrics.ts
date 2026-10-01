import { metrics } from '@opentelemetry/api';

/**
 * Application metrics exported to OpenObserve. The OpenTelemetry API is a
 * no-op until instrumentation.ts registers the SDK, so recording is free in
 * development and in tests.
 */
const meter = metrics.getMeter('elsa');

export const appMetrics = {
  answersSubmitted: meter.createCounter('app.quiz.answers.submitted', {
    description: 'Answers recorded, by correctness',
  }),
  answersRejected: meter.createCounter('app.quiz.answers.rejected', {
    description: 'Answer submissions rejected after validation, by reason',
  }),
  playersJoined: meter.createCounter('app.quiz.players.joined', {
    description: 'Players who joined a session',
  }),
  sessionsStarted: meter.createCounter('app.quiz.sessions.started', {
    description: 'Sessions started by an admin',
  }),
  sessionsFinished: meter.createCounter('app.quiz.sessions.finished', {
    description: 'Sessions finished by the lifecycle worker',
  }),
  socketsActive: meter.createUpDownCounter('app.realtime.sockets.active', {
    description: 'Open Socket.IO connections on this instance',
  }),
  leaderboardBroadcasts: meter.createCounter('app.realtime.leaderboard.broadcasts', {
    description: 'Leaderboard broadcasts sent (after throttling)',
  }),
  jobsFailed: meter.createCounter('app.queue.jobs.failed', {
    description: 'Failed queue job attempts, by queue',
  }),
  submissionPersistDuration: meter.createHistogram('app.queue.submission.persist.duration', {
    description: 'Time to write one answer to PostgreSQL',
    unit: 'ms',
  }),
};
