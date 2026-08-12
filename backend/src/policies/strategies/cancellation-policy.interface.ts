export interface CancellationContext {
  /** Now (cancellation moment), UTC. */
  now: Date;
  /** Booking start, UTC. */
  bookingStart: Date;
}

export interface RefundResult {
  refundPct: number;
  penaltyPct: number;
  appliedRule?: string;
}

export interface CancellationPolicy {
  readonly id: string;
  calculateRefund(ctx: CancellationContext): RefundResult;
}

export interface TieredRule {
  /** Minimum hours before start to apply this rule (inclusive). */
  hoursBeforeStart: number;
  /** Refund percentage (0-100). */
  refundPct: number;
  /** Human-readable label. */
  label?: string;
}