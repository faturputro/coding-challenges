import Connection from '@server/config/connection';
import { IRedisRepository } from '@server/types/redis.interface';
import dayjs, { ManipulateType } from 'dayjs';

export default class RedisRepo implements IRedisRepository {
  private readonly redis = Connection.Redis();

  async get(key: string) {
    return this.redis.get(key);
  }

  async set(key: string, value: string, duration: number, expUnit: ManipulateType) {
    const redisExpiryInSeconds = (duration: number, unit: ManipulateType): number => {
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new RangeError('Redis expiry duration must be greater than zero');
      }

      const now = dayjs();
      return now.add(duration, unit).diff(now, 'second');
    };

    await this.redis.set(key, value, 'EX', redisExpiryInSeconds(duration, expUnit));
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  async getTTL(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async isKeyExists(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }
}
