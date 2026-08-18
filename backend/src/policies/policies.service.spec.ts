import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PrismaService } from '../prisma/prisma.service';
import { TieredPolicy } from './strategies/concrete-policies';

describe('PoliciesService', () => {
  let service: PoliciesService;
  let prisma: any;

  const customRules = [
    { hoursBeforeStart: 48, refundPct: 100, label: 'free-48h' },
    { hoursBeforeStart: 0, refundPct: 0, label: 'no-refund' },
  ];

  const globalRules = [
    { hoursBeforeStart: 24, refundPct: 100, label: 'free-24h' },
    { hoursBeforeStart: 2, refundPct: 50, label: 'partial' },
    { hoursBeforeStart: 0, refundPct: 0, label: 'no-refund' },
  ];

  beforeEach(async () => {
    prisma = {
      cancellationPolicy: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolveForResource', () => {
    it('returns custom policy when found', async () => {
      prisma.cancellationPolicy.findUnique.mockResolvedValue({
        id: 'pol-1',
        resourceId: 'res-1',
        rules: customRules,
      });
      const result = await service.resolveForResource('res-1');
      expect(result).toBeInstanceOf(TieredPolicy);
    });

    it('falls back to global policy when no custom', async () => {
      prisma.cancellationPolicy.findFirst.mockResolvedValue({
        id: 'pol-global',
        resourceId: null,
        rules: globalRules,
      });
      const result = await service.resolveForResource('res-1');
      expect(result).toBeInstanceOf(TieredPolicy);
    });

    it('falls back to built-in default when no policies in DB', async () => {
      const result = await service.resolveForResource('res-1');
      expect(result).toBeInstanceOf(TieredPolicy);
      const refund = result.calculateRefund({
        now: new Date('2030-01-01T00:00:00Z'),
        bookingStart: new Date('2030-01-02T01:00:00Z'),
      });
      expect(refund.refundPct).toBe(100);
    });

    it('throws NotFoundException for invalid DB rules', async () => {
      prisma.cancellationPolicy.findUnique.mockResolvedValue({
        id: 'pol-bad',
        resourceId: 'res-1',
        rules: [],
      });
      await expect(service.resolveForResource('res-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDefaultRules', () => {
    it('returns default rules array', () => {
      const rules = service.getDefaultRules();
      expect(rules).toHaveLength(3);
      expect(rules[0].hoursBeforeStart).toBe(24);
      expect(rules[2].hoursBeforeStart).toBe(0);
    });

    it('returns a copy (not the original)', () => {
      const rules1 = service.getDefaultRules();
      const rules2 = service.getDefaultRules();
      expect(rules1).not.toBe(rules2);
      expect(rules1).toEqual(rules2);
    });
  });

  describe('getRulesForResource', () => {
    it('returns custom with source=custom', async () => {
      prisma.cancellationPolicy.findUnique.mockResolvedValue({
        id: 'pol-1',
        rules: customRules,
      });
      const result = await service.getRulesForResource('res-1');
      expect(result.source).toBe('custom');
      expect(result.rules).toEqual(customRules);
    });

    it('returns global with source=global', async () => {
      prisma.cancellationPolicy.findFirst.mockResolvedValue({
        id: 'pol-global',
        rules: globalRules,
      });
      const result = await service.getRulesForResource('res-1');
      expect(result.source).toBe('global');
    });

    it('returns default with source=default', async () => {
      const result = await service.getRulesForResource('res-1');
      expect(result.source).toBe('default');
      expect(result.rules).toHaveLength(3);
    });
  });

  describe('setForResource', () => {
    it('upserts policy for resource', async () => {
      prisma.cancellationPolicy.upsert.mockResolvedValue({ id: 'pol-1', rules: customRules });
      await service.setForResource('res-1', customRules);
      expect(prisma.cancellationPolicy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { resourceId: 'res-1' } }),
      );
    });
  });

  describe('setGlobal', () => {
    it('creates global policy when none exists', async () => {
      prisma.cancellationPolicy.findFirst.mockResolvedValue(null);
      prisma.cancellationPolicy.create.mockResolvedValue({ id: 'pol-new', rules: globalRules });
      await service.setGlobal(globalRules);
      expect(prisma.cancellationPolicy.create).toHaveBeenCalled();
    });

    it('updates existing global policy', async () => {
      prisma.cancellationPolicy.findFirst.mockResolvedValue({ id: 'pol-existing' });
      prisma.cancellationPolicy.update.mockResolvedValue({ id: 'pol-existing', rules: globalRules });
      await service.setGlobal(globalRules);
      expect(prisma.cancellationPolicy.update).toHaveBeenCalled();
    });
  });
});
