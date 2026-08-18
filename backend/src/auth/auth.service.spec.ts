import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn().mockResolvedValue(true),
}));

import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let config: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CLIENT',
    isActive: true,
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(mockUser),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
      verifyAsync: jest.fn(),
    };

    const configMap: Record<string, unknown> = {
      'argon2.memoryCost': 19456,
      'argon2.timeCost': 2,
      'argon2.parallelism': 1,
      'jwt.accessTtl': '15m',
      'jwt.refreshTtl': '7d',
      'jwt.accessSecret': 'access-secret',
      'jwt.refreshSecret': 'refresh-secret',
    };

    config = {
      get: jest.fn((key: string, defaultVal?: unknown) => configMap[key] ?? defaultVal),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('creates a user with normalized email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register('TEST@Example.COM', 'pass123', 'Test');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(argon2.hash).toHaveBeenCalledWith('pass123', expect.any(Object));
      expect(result).toEqual(mockUser);
    });

    it('throws ConflictException on duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.register('test@example.com', 'pass', 'Name')).rejects.toThrow(ConflictException);
    });

    it('defaults role to CLIENT', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await service.register('a@b.com', 'pass', 'Name');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: 'CLIENT' }) }),
      );
    });
  });

  describe('login', () => {
    it('returns token pair on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login('test@example.com', 'pass123');
      expect(result.accessToken).toBe('signed-jwt');
      expect(result.refreshToken).toBe('signed-jwt');
      expect(result.user).toEqual(expect.objectContaining({ id: 'user-1' }));
    });

    it('throws UnauthorizedException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('no@user.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });
      await expect(service.login('test@example.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const validPayload = { sub: 'user-1', email: 'test@example.com', role: 'CLIENT', type: 'refresh' };

    it('issues new tokens on valid refresh', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');
      expect(result.accessToken).toBe('signed-jwt');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
      );
    });

    it('throws on invalid JWT', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid'));
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws on wrong token type', async () => {
      jwt.verifyAsync.mockResolvedValue({ ...validPayload, type: 'access' });
      await expect(service.refresh('access-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws on revoked token', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
      });
      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws on expired token', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: mockUser,
      });
      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws on inactive user', async () => {
      jwt.verifyAsync.mockResolvedValue(validPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: { ...mockUser, isActive: false },
      });
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes matching unrevoked tokens', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      await service.logout('some-token');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('logoutAll', () => {
    it('revokes all unrevoked tokens for user', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });
      await service.logoutAll('user-1');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', revokedAt: null },
        }),
      );
    });
  });
});
