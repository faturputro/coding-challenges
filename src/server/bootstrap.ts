import type Redis from 'ioredis';
import Connection from './config/connection';

/**
 * The client is lazyConnect, so it only connects on the first command. Connect
 * explicitly when nothing has started it yet (otherwise processes that issue
 * no command at startup, like the worker, wait forever), and just wait when
 * something else (e.g. the rate limiter) already triggered the connection.
 */
const connectRedis = async (redis: Redis) => {
  if (redis.status === 'ready') return;
  if (redis.status === 'wait') return redis.connect();

  await new Promise<void>((resolve, reject) => {
    redis.once('ready', () => resolve());
    redis.once('error', (err) => reject(err));
  });
};

export const acquireConnections = async () => {
  const db = Connection.DB();
  const redis = Connection.Redis();

  await Promise.all([
    db.authenticate(),
    connectRedis(redis),
  ]);

  redis.on('error', (err) => console.log('Redis error:', err.message, '=>', JSON.stringify(err)));
  return { db, redis };
};
