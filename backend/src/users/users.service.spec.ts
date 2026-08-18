import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CLIENT',
    isActive: true,
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        findMany: jest.fn().mockResolvedValue([mockUser]),
        update: jest.fn().mockResolvedValue(mockUser),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('returns user when found', async () => {
      const result = await service.findById('user-1');
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findById('missing');
      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('returns user when found', async () => {
      const result = await service.findByIdOrFail('user-1');
      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByIdOrFail('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('normalizes email to lowercase', async () => {
      await service.findByEmail('TEST@EXAMPLE.COM');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('returns null when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findByEmail('no@user.com');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('returns all users ordered by createdAt desc', async () => {
      const result = await service.list();
      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    });
  });

  describe('updateRole', () => {
    it('updates user role', async () => {
      prisma.user.update.mockResolvedValue({ ...mockUser, role: 'ADMIN' });
      const result = await service.updateRole('user-1', 'ADMIN');
      expect(result.role).toBe('ADMIN');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'ADMIN' },
      });
    });
  });

  describe('setActive', () => {
    it('deactivates user', async () => {
      prisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });
      const result = await service.setActive('user-1', false);
      expect(result.isActive).toBe(false);
    });

    it('activates user', async () => {
      prisma.user.update.mockResolvedValue({ ...mockUser, isActive: true });
      const result = await service.setActive('user-1', true);
      expect(result.isActive).toBe(true);
    });
  });
});
