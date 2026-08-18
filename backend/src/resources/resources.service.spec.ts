import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let prisma: any;

  const mockResource = {
    id: 'res-1',
    name: 'Court 1',
    description: 'A court',
    mode: 'EXCLUSIVE',
    capacity: 1,
    timezone: 'UTC',
    pricePerHour: 20,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schedules: [],
    photos: [],
  };

  beforeEach(async () => {
    prisma = {
      resource: {
        findMany: jest.fn().mockResolvedValue([mockResource]),
        findUnique: jest.fn().mockResolvedValue(mockResource),
        create: jest.fn().mockResolvedValue(mockResource),
        update: jest.fn().mockResolvedValue(mockResource),
        delete: jest.fn().mockResolvedValue(mockResource),
      },
      resourceSchedule: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      resourcePhoto: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('lists active resources by default', async () => {
      await service.list();
      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('lists all resources when onlyActive=false', async () => {
      await service.list(false);
      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('findById', () => {
    it('returns resource by id', async () => {
      const result = await service.findById('res-1');
      expect(result.id).toBe('res-1');
    });

    it('throws NotFoundException for missing resource', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const validDto = {
      name: 'New Court',
      schedules: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '12:00' }],
    };

    it('creates resource with EXCLUSIVE mode and capacity=1', async () => {
      await service.create(validDto);
      expect(prisma.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mode: 'EXCLUSIVE', capacity: 1 }),
        }),
      );
    });

    it('allows SHARED mode with custom capacity', async () => {
      await service.create({ ...validDto, mode: 'SHARED', capacity: 4 });
      expect(prisma.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mode: 'SHARED', capacity: 4 }),
        }),
      );
    });

    it('throws BadRequestException when openTime >= closeTime', async () => {
      await expect(
        service.create({
          name: 'Bad Court',
          schedules: [{ dayOfWeek: 1, openTime: '12:00', closeTime: '09:00' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when openTime == closeTime', async () => {
      await expect(
        service.create({
          name: 'Bad Court',
          schedules: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '09:00' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates non-Prisma errors', async () => {
      prisma.resource.create.mockRejectedValue(new Error('DB connection failed'));
      await expect(service.create(validDto)).rejects.toThrow('DB connection failed');
    });
  });

  describe('update', () => {
    it('updates resource fields', async () => {
      await service.update('res-1', { name: 'Updated' });
      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Updated' }) }),
      );
    });

    it('replaces schedules when provided', async () => {
      await service.update('res-1', {
        schedules: [{ dayOfWeek: 2, openTime: '10:00', closeTime: '14:00' }],
      });
      expect(prisma.resourceSchedule.deleteMany).toHaveBeenCalled();
      expect(prisma.resourceSchedule.createMany).toHaveBeenCalled();
    });

    it('throws NotFoundException for missing resource', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('validates schedules when provided', async () => {
      await expect(
        service.update('res-1', {
          schedules: [{ dayOfWeek: 1, openTime: '15:00', closeTime: '10:00' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes existing resource', async () => {
      await service.remove('res-1');
      expect(prisma.resource.delete).toHaveBeenCalledWith({ where: { id: 'res-1' } });
    });

    it('throws NotFoundException for missing resource', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
