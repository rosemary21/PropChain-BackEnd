import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../database/prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // FIX: Using forwardRef to allow AuthModule and UsersModule to depend on each other
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService], // This allows AuthService to use UserService
})
export class UsersModule {}