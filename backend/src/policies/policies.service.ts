import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CancellationPolicy, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TieredPolicy } from './strategies/concrete-policies';
import type {
  CancellationPolicy as ICancellationPolicy,
  TieredRule,
} from './strategies/cancellation-policy.interface';

const DEFAULT_RULES: TieredRule[] = [
  { hoursBeforeStart: 24, refundPct: 100, label: 'free-24h' },
  { hoursBeforeStart: 2, refundPct: 50, label: 'partial-2h-24h' },
  { hoursBeforeStart: 0, refundPct: 0, label: 'no-refund' },
];

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveForResource(resourceId: string): Promise<ICancellationPolicy> {
    const custom = await this.prisma.cancellationPolicy.findUnique({
      where: { resourceId },
    });
    if (custom) return this.fromDb(custom);

    const fallback = await this.prisma.cancellationPolicy.findFirst({
      where: { resourceId: null },
    });
    if (fallback) return this.fromDb(fallback);

    this.logger.debug('No policy configured, using built-in default');
    return new TieredPolicy(DEFAULT_RULES);
  }

  async setForResource(
    resourceId: string,
    rules: TieredRule[],
  ): Promise<CancellationPolicy> {
    return this.prisma.cancellationPolicy.upsert({
      where: { resourceId },
      update: { rules: rules as unknown as Prisma.InputJsonValue },
      create: {
        resourceId,
        rules: rules as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async setGlobal(rules: TieredRule[]): Promise<CancellationPolicy> {
    const existing = await this.prisma.cancellationPolicy.findFirst({
      where: { resourceId: null },
    });
    if (existing) {
      return this.prisma.cancellationPolicy.update({
        where: { id: existing.id },
        data: { rules: rules as unknown as Prisma.InputJsonValue },
      });
    }
    return this.prisma.cancellationPolicy.create({
      data: {
        resourceId: null,
        rules: rules as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private fromDb(record: CancellationPolicy): ICancellationPolicy {
    const rules = record.rules as unknown as TieredRule[];
    if (!Array.isArray(rules) || rules.length === 0) {
      throw new NotFoundException(`Invalid policy rules for ${record.id}`);
    }
    return new TieredPolicy(rules);
  }

  getDefaultRules(): TieredRule[] {
    return [...DEFAULT_RULES];
  }

  async getRulesForResource(resourceId: string): Promise<{ rules: TieredRule[]; source: 'custom' | 'global' | 'default' }> {
    const custom = await this.prisma.cancellationPolicy.findUnique({
      where: { resourceId },
    });
    if (custom) {
      return { rules: custom.rules as unknown as TieredRule[], source: 'custom' };
    }

    const fallback = await this.prisma.cancellationPolicy.findFirst({
      where: { resourceId: null },
    });
    if (fallback) {
      return { rules: fallback.rules as unknown as TieredRule[], source: 'global' };
    }

    return { rules: [...DEFAULT_RULES], source: 'default' };
  }
}