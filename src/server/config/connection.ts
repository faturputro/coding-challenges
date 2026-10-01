import 'reflect-metadata';
import models from '../models/sql';
import type { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import { Sequelize } from 'sequelize-typescript';
import { DB_CONFIG, DEV_MODE, REDIS_CONFIG } from './app.config';

const customLogger = (query: string) => console.log(query);

// biome-ignore lint/complexity/noStaticOnlyClass: intended singleton class
class Connection {
	private static db: Sequelize;
	private static redis: Redis;

	private static redisOptions(): { host: string; port: number; db: number; password?: string } {
		const port = Number(REDIS_CONFIG.PORT);
		const db = Number(REDIS_CONFIG.DB);

		if (!Number.isInteger(port) || port < 1 || port > 65535 || !Number.isInteger(db) || db < 0) {
			throw new Error('Redis requires a valid port and non-negative integer database index');
		}

		return { host: REDIS_CONFIG.HOST, port, db, password: REDIS_CONFIG.PASSWORD };
	}

	/**
	 * Options for BullMQ queues and workers. BullMQ opens its own connections
	 * and requires maxRetriesPerRequest: null so blocking commands survive
	 * reconnects, unlike the bounded retries of the shared client.
	 */
	public static QueueOptions(): ConnectionOptions {
		return { ...Connection.redisOptions(), maxRetriesPerRequest: null };
	}

	public static Redis(): Redis {
		if (!Connection.redis) {
			Connection.redis = new Redis({
				...Connection.redisOptions(),
				lazyConnect: true,
				maxRetriesPerRequest: 3,
				connectTimeout: 5000,
			});

			Connection.redis.on('error', (error) => console.error('Redis error:', error.message));
		}

		return Connection.redis;
	}

	public static DB(): Sequelize {
		if (!Connection.db) {
			const instance = new Sequelize({
				database: DB_CONFIG.DB_NAME,
				dialect: 'postgres',
				logging: DEV_MODE ? customLogger : false,
				logQueryParameters: DEV_MODE,
				models,
				username: DB_CONFIG.DB_USER,
				password: DB_CONFIG.DB_PASSWORD,
				host: DB_CONFIG.DB_HOST,
				port: DB_CONFIG.DB_PORT,
				timezone: '+00:00',
				dialectOptions: {
					decimalNumbers: true,
				},
				define: {
					underscored: true,
				},
			});

			Connection.db = instance;
		}

		return Connection.db;
	}
}

export default Connection;
