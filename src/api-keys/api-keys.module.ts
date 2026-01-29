import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { PrismaModule } from '../database/prisma/prisma.module';
import { PaginationService } from '../common/pagination';
import { RedisService } from '../common/services/redis.service';
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, PaginationService, RedisService],
  exports: [ApiKeyService],
})
export class ApiKeysModule {}
