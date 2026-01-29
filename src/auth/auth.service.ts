import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from '../users/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../common/services/redis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    await this.sendVerificationEmail(user.id, user.email);
    return {
      message: 'User registered successfully. Please check your email for verification.',
    };
  }

  async login(credentials: {
    email?: string;
    password?: string;
    walletAddress?: string;
    signature?: string;
  }) {
    let user: any;

    if (credentials.email && credentials.password) {
      user = await this.validateUserByEmail(
        credentials.email,
        credentials.password,
      );
    } else if (credentials.walletAddress) {
      user = await this.validateUserByWallet(
        credentials.walletAddress,
        credentials.signature,
      );
    } else {
      throw new BadRequestException(
        'Email/password or wallet address/signature required',
      );
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async validateUserByEmail(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user as any;
    return result;
  }

  async validateUserByWallet(
    walletAddress: string,
    signature?: string,
  ): Promise<any> {
    let user = await this.userService.findByWalletAddress(walletAddress);

    if (!user) {
      user = await this.userService.create({
        email: `${walletAddress}@wallet.auth`,
        password: Math.random().toString(36).slice(-10),
        walletAddress,
        firstName: 'Web3',
        lastName: 'User',
      });
    }

    const { password: _, ...result } = user as any;
    return result;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const storedToken = await this.redisService.get(
        `refresh_token:${payload.sub}`,
      );
      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.redisService.del(`refresh_token:${userId}`);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return { message: 'If email exists, a reset link has been sent' };
    }

    const resetToken = uuidv4();
    const resetTokenExpiry = Date.now() + 3600000;

    await this.redisService.set(
      `password_reset:${resetToken}`,
      JSON.stringify({ userId: user.id, expiry: resetTokenExpiry }),
    );

    await this.sendPasswordResetEmail(user.email, resetToken);
    return { message: 'If email exists, a reset link has been sent' };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const resetData = await this.redisService.get(
      `password_reset:${resetToken}`,
    );

    if (!resetData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const { userId, expiry } = JSON.parse(resetData);

    if (Date.now() > expiry) {
      await this.redisService.del(`password_reset:${resetToken}`);
      throw new BadRequestException('Reset token has expired');
    }

    await this.userService.updatePassword(userId, newPassword);
    await this.redisService.del(`password_reset:${resetToken}`);

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(token: string) {
    const verificationData = await this.redisService.get(
      `email_verification:${token}`,
    );

    if (!verificationData) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const { userId } = JSON.parse(verificationData);
    await this.userService.verifyUser(userId);
    await this.redisService.del(`email_verification:${token}`);

    return { message: 'Email verified successfully' };
  }

  private generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_EXPIRES_IN',
        '15m',
      ) as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ) as any,
    });

    this.redisService.set(`refresh_token:${user.id}`, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        isVerified: user.isVerified,
      },
    };
  }

  private async sendVerificationEmail(userId: string, email: string) {
    const verificationToken = uuidv4();
    await this.redisService.set(
      `email_verification:${verificationToken}`,
      JSON.stringify({ userId }),
    );
    console.log(
      `Verification email sent to ${email} with token: ${verificationToken}`,
    );
  }

  private async sendPasswordResetEmail(email: string, resetToken: string) {
    console.log(
      `Password reset email sent to ${email} with token: ${resetToken}`,
    );
  }
}
