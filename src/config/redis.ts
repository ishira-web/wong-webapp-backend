import Redis from 'ioredis';
import env from './env';
import logger from './logger';

const redisConfig = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

const redis = new Redis(env.REDIS_URL, {
  ...redisConfig,
  password: env.REDIS_PASSWORD || undefined,
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

export default redis;

export const connectRedis = async () => {
  try {
    await redis.ping();
    logger.info('Redis is ready');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

export const disconnectRedis = async () => {
  try {
    await redis.quit();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error('Redis disconnection failed:', error);
  }
};
