import { ConfigService } from '@nestjs/config';

export const createRedisConfig = (configService: ConfigService) => ({
  host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
  port: configService.get<number>('REDIS_PORT', 6379),
  password: configService.get<string>('REDIS_PASSWORD'),
  db: configService.get<number>('REDIS_DB', 0),
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  //   retryStrategy: (times: number) => {
  //     return Math.min(times * 50, 2000);
  //   },
});
