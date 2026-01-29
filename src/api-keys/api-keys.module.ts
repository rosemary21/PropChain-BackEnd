import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { PrismaModule } from '../database/prisma/prisma.module';
import { RedisModule } from 'node_modules/@liaoliaots/nestjs-redis/dist/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeysModule {}
