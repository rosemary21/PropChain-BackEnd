import { Strategy } from 'passport-custom';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ethers } from 'ethers';
import { UserService } from '../../users/user.service';

@Injectable()
export class Web3Strategy extends PassportStrategy(Strategy, 'web3') {
  constructor(private userService: UserService) {
    super();
  }

  async validate(req: any) {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      throw new UnauthorizedException(
        'Wallet address and signature are required',
      );
    }

    // Verify the signature
    const isValid = await this.verifySignature(walletAddress, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Find or create user
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

    return user;
  }

  private async verifySignature(
    walletAddress: string,
    signature: string,
  ): Promise<boolean> {
    try {
      // NOTE: In production, use a nonce stored in Redis to prevent replay attacks
      const message =
        'Welcome to PropChain!\n\nClick to sign in and accept the Terms of Service.';

      const recoveredAddress = ethers.verifyMessage(message, signature);
      return (
        recoveredAddress.toLowerCase() === walletAddress.toLowerCase()
      );
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
}
