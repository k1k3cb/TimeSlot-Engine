import { differenceInMinutes } from '../utils/time-diff';
import type {
  CancellationContext,
  CancellationPolicy,
  RefundResult,
  TieredRule,
} from './cancellation-policy.interface';

export class TieredPolicy implements CancellationPolicy {
  readonly id = 'tiered';

  constructor(private readonly rules: TieredRule[]) {
    if (rules.length === 0) {
      throw new Error('TieredPolicy requires at least one rule');
    }
    const sorted = [...rules].sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart);
    if (sorted[sorted.length - 1].hoursBeforeStart !== 0) {
      throw new Error('TieredPolicy must include a rule with hoursBeforeStart=0');
    }
  }

  calculateRefund(ctx: CancellationContext): RefundResult {
    const minutesUntil = differenceInMinutes(ctx.bookingStart, ctx.now);
    const hoursUntil = minutesUntil / 60;

    const sortedRules = [...this.rules].sort(
      (a, b) => b.hoursBeforeStart - a.hoursBeforeStart,
    );
    const matched =
      sortedRules.find((r) => hoursUntil >= r.hoursBeforeStart) ?? sortedRules[sortedRules.length - 1];

    return {
      refundPct: matched.refundPct,
      penaltyPct: 100 - matched.refundPct,
      appliedRule: matched.label ?? `>=${matched.hoursBeforeStart}h:${matched.refundPct}%`,
    };
  }
}

export class NoRefundPolicy implements CancellationPolicy {
  readonly id = 'no-refund';
  calculateRefund(_ctx: CancellationContext): RefundResult {
    return { refundPct: 0, penaltyPct: 100, appliedRule: 'no-refund' };
  }
}

export class FreeUntilStartPolicy implements CancellationPolicy {
  readonly id = 'free-until-start';
  calculateRefund(ctx: CancellationContext): RefundResult {
    const cancelled = ctx.now <= ctx.bookingStart;
    return cancelled
      ? { refundPct: 100, penaltyPct: 0, appliedRule: 'free' }
      : { refundPct: 0, penaltyPct: 100, appliedRule: 'past-start' };
  }
}