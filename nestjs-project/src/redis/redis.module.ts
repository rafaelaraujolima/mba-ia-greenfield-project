import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import queueConfig from '../config/queue.config';
import { REDIS_CLIENT } from './redis.constants';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [queueConfig.KEY],
      useFactory: (config: ConfigType<typeof queueConfig>) =>
        new Redis({ host: config.host, port: config.port }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }
}
