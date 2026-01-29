import { User as PrismaUser, UserRole } from '@prisma/client';

export { UserRole };

export class User implements PrismaUser {
  id: string;
  email: string;
  password: string | null;

  firstName: string | null;
  lastName: string | null;

  walletAddress: string | null;

  isVerified: boolean;

  roleId: string | null;
  role: UserRole;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input used when creating a user
 * Flexible enough for email/password and Web3 users
 */
export type CreateUserInput = {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  role?: UserRole;
  roleId?: string;
};

export type UpdateUserInput = Partial<CreateUserInput>;
