import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types/auth.types';

interface Argon2Options {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

interface JwtTtls {
  access: string;
  refresh: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: Pick<User, 'id' | 'email' | 'name' | 'role'>;
}

@Injectable()
export class AuthService {
  private readonly argonOpts: Argon2Options;
  private readonly ttls: JwtTtls;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.argonOpts = {
      memoryCost: this.config.get<number>('argon2.memoryCost', 19456),
      timeCost: this.config.get<number>('argon2.timeCost', 2),
      parallelism: this.config.get<number>('argon2.parallelism', 1),
    };
    this.ttls = {
      access: this.config.get<string>('jwt.accessTtl', '15m'),
      refresh: this.config.get<string>('jwt.refreshTtl', '7d'),
    };
  }

  async register(
    email: string,
    password: string,
    name: string,
    role: Role = 'CLIENT',
  ): Promise<User> {
    const normalized = email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(password, this.argonOpts);
    return this.prisma.user.create({
      data: { email: normalized, passwordHash, name, role },
    });
  }

  async login(email: string, password: string): Promise<TokenPairResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPairResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Wrong token type');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }
    if (!stored.user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user, false);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: User, withUser = true): Promise<TokenPairResponse> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    const accessToken = await this.jwt.signAsync(accessPayload as object, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.ttls.access as unknown as number,
    });

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };
    const refreshJwt = await this.jwt.signAsync(refreshPayload as object, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.ttls.refresh as unknown as number,
    });

    const tokenHash = this.hashToken(refreshJwt);
    const expiresAt = new Date(Date.now() + this.parseTtlSeconds(this.ttls.refresh) * 1000);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const response: TokenPairResponse = {
      accessToken,
      refreshToken: refreshJwt,
      expiresIn: this.parseTtlSeconds(this.ttls.access),
    };
    if (withUser) {
      response.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }
    return response;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtlSeconds(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) throw new BadRequestException(`Invalid TTL format: ${ttl}`);
    const value = Number(m[1]);
    const unit = m[2];
    const factor = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return value * factor;
  }
}