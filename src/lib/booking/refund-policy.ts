// Pure, client-safe. The cancellation/refund policy, in one place so the
// parent's cancel dialog and the server action agree on the number.
//
// Policy (set 2026-09-02):
//   - Parent cancels 24+ h before start -> full refund, minus the Paystack
//     processing fee (which Paystack keeps on a refund). Parent bears the fee.
//   - Parent cancels < 24 h before start -> 50% refund, minus the fee.
//   - No-show, or a cancel after the start time -> no refund.
//   - Therapist cancels -> full refund, Hayven absorbs the fee (the family
//     shouldn't lose money to a therapist's unreliability).

export type CancelInitiator = "parent" | "therapist";

export interface RefundInput {
  /** Naira the parent was actually charged for this booking. */
  amountPaidNaira: number;
  slotStartMs: number;
  nowMs: number;
  initiatedBy: CancelInitiator;
}

export interface RefundOutcome {
  tier: "full" | "partial" | "none";
  /** Naira the parent gets back. */
  refundNaira: number;
  /** Naira withheld (fee + any retained portion). */
  withheldNaira: number;
  /** The non-refundable Paystack fee, when the parent bears it (0 otherwise). */
  feeNaira: number;
}

export const FREE_CANCEL_MS = 24 * 60 * 60 * 1000;

/**
 * Paystack Nigeria local-card pricing: 1.5% + ₦100, the ₦100 waived below
 * ₦2,500, capped at ₦2,000. Paystack keeps this fee when a charge is
 * refunded, so it's the amount that can't come back to the parent.
 */
export function paystackFeeNaira(amountNaira: number): number {
  if (amountNaira <= 0) return 0;
  const pct = amountNaira * 0.015;
  const flat = amountNaira >= 2500 ? 100 : 0;
  return Math.min(Math.round(pct + flat), 2000);
}

export function computeRefund(input: RefundInput): RefundOutcome {
  const { amountPaidNaira, slotStartMs, nowMs, initiatedBy } = input;

  if (amountPaidNaira <= 0) {
    return { tier: "none", refundNaira: 0, withheldNaira: 0, feeNaira: 0 };
  }

  if (initiatedBy === "therapist") {
    return { tier: "full", refundNaira: amountPaidNaira, withheldNaira: 0, feeNaira: 0 };
  }

  if (nowMs >= slotStartMs) {
    return { tier: "none", refundNaira: 0, withheldNaira: amountPaidNaira, feeNaira: 0 };
  }

  const fee = paystackFeeNaira(amountPaidNaira);
  const notice = slotStartMs - nowMs;

  if (notice >= FREE_CANCEL_MS) {
    const refund = Math.max(0, amountPaidNaira - fee);
    return { tier: "full", refundNaira: refund, withheldNaira: amountPaidNaira - refund, feeNaira: fee };
  }

  const half = Math.round(amountPaidNaira / 2);
  const refund = Math.max(0, half - fee);
  return { tier: "partial", refundNaira: refund, withheldNaira: amountPaidNaira - refund, feeNaira: fee };
}
