import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bull';

// Core & Database
import { PrismaModule } from './database/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ConfigurationModule } from './config/configuration.module';
import configuration from './config/configuration';
import valuationConfig from './config/valuation.config';

// Logging
import { LoggingModule } from './common/logging/logging.module';
import { LoggingMiddleware } from './common/logging/logging.middleware';

// Redis
import { RedisModule } from './common/services/redis.module';
import { createRedisConfig } from './common/services/redis.config';

// Business Modules
import { PropertiesModule } from './properties/properties.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { ValuationModule } from './valuation/valuation.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { DocumentsModule } from './documents/documents.module';

// Middleware
import { AuthRateLimitMiddleware } from './auth/middleware/auth.middleware';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, valuationConfig],
      envFilePath: ['.env.local', '.env.development', '.env'],
    }),
    ConfigurationModule,

    // Core
    LoggingModule,
    PrismaModule,
    HealthModule,
    RedisModule,

    // Security & rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60),
          limit: configService.get<number>('THROTTLE_LIMIT', 10),
        },
      ],
    }),

    // Background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createRedisConfig,
    }),

    // Scheduling & health
    ScheduleModule.forRoot(),
    TerminusModule,

    // Business
    AuthModule,
    ApiKeysModule,
    UsersModule,
    PropertiesModule,
    TransactionsModule,
    BlockchainModule,
    FilesModule,
    ValuationModule,
    DocumentsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // Correlation ID & structured logging for all routes
      .apply(LoggingMiddleware)
      .forRoutes('*')
      // Auth rate limiting
      .apply(AuthRateLimitMiddleware)
      .forRoutes('/auth*');
  }
}
