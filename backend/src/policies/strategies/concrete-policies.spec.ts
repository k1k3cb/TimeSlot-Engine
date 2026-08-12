import { TieredPolicy, NoRefundPolicy, FreeUntilStartPolicy } from './concrete-policies';

describe('TieredPolicy', () => {
  const policy = new TieredPolicy([
    { hoursBeforeStart: 24, refundPct: 100, label: 'free-24h' },
    { hoursBeforeStart: 2, refundPct: 50, label: 'partial' },
    { hoursBeforeStart: 0, refundPct: 0, label: 'no-refund' },
  ]);

  it('returns 100% refund when > 24h before start', () => {
    const result = policy.calculateRefund({
      now: new Date('2026-01-12T10:00:00Z'),
      bookingStart: new Date('2026-01-14T11:00:00Z'),
    });
    expect(result.refundPct).toBe(100);
    expect(result.appliedRule).toBe('free-24h');
  });

  it('returns 50% refund when between 24h and 2h before start', () => {
    const result = policy.calculateRefund({
      now: new Date('2026-01-12T10:00:00Z'),
      bookingStart: new Date('2026-01-12T20:00:00Z'),
    });
    expect(result.refundPct).toBe(50);
    expect(result.appliedRule).toBe('partial');
  });

  it('returns 0% refund when less than 2h before start', () => {
    const result = policy.calculateRefund({
      now: new Date('2026-01-12T10:00:00Z'),
      bookingStart: new Date('2026-01-12T11:00:00Z'),
    });
    expect(result.refundPct).toBe(0);
    expect(result.appliedRule).toBe('no-refund');
  });

  it('throws when rules missing the 0-hour floor', () => {
    expect(() => new TieredPolicy([{ hoursBeforeStart: 24, refundPct: 100 }])).toThrow();
  });
});

describe('NoRefundPolicy', () => {
  it('always returns 0%', () => {
    const p = new NoRefundPolicy();
    expect(
      p.calculateRefund({
        now: new Date('2026-01-12T10:00:00Z'),
        bookingStart: new Date('2026-01-14T10:00:00Z'),
      }).refundPct,
    ).toBe(0);
  });
});

describe('FreeUntilStartPolicy', () => {
  it('refunds 100% if cancelled before start', () => {
    const p = new FreeUntilStartPolicy();
    const r = p.calculateRefund({
      now: new Date('2026-01-12T10:00:00Z'),
      bookingStart: new Date('2026-01-12T11:00:00Z'),
    });
    expect(r.refundPct).toBe(100);
  });

  it('refunds 0% if cancelled after start', () => {
    const p = new FreeUntilStartPolicy();
    const r = p.calculateRefund({
      now: new Date('2026-01-12T12:00:00Z'),
      bookingStart: new Date('2026-01-12T11:00:00Z'),
    });
    expect(r.refundPct).toBe(0);
  });
});