// Pure, client-safe. The cancellation/refund policy, in one place so the
// parent's cancel dialog and the server action agree on the number.
//
// Policy (set 2026-09-02):
//   - Parent cancels 24+ h before start -> full refund, minus the Flutterwave
//     processing fee (which Flutterwave keeps on a refund). Parent bears the fee.
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
  /** The non-refundable Flutterwave fee, when the parent bears it (0 otherwise). */
  feeNaira: number;
}

export const FREE_CANCEL_MS = 24 * 60 * 60 * 1000;

/**
 * Flutterwave Nigeria local pricing (flutterwave.com/ng/pricing, checked
 * 2026-10-15): 2% per transaction (1.4% transaction fee + 0.6% platform
 * fee), no cap listed, plus 7.5% VAT on the fee. Treated as kept by
 * Flutterwave when a charge is refunded, so it's the amount that can't
 * come back to the parent. Confirm both points with Flutterwave; if your
 * account has a cap or different rate, change it here.
 */
export const GATEWAY_FEE_RATE = 0.02;
export const GATEWAY_FEE_VAT = 0.075;

export function gatewayFeeNaira(amountNaira: number): number {
  if (amountNaira <= 0) return 0;
  return Math.round(amountNaira * GATEWAY_FEE_RATE * (1 + GATEWAY_FEE_VAT));
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

  const fee = gatewayFeeNaira(amountPaidNaira);
  const notice = slotStartMs - nowMs;

  if (notice >= FREE_CANCEL_MS) {
    const refund = Math.max(0, amountPaidNaira - fee);
    return { tier: "full", refundNaira: refund, withheldNaira: amountPaidNaira - refund, feeNaira: fee };
  }

  const half = Math.round(amountPaidNaira / 2);
  const refund = Math.max(0, half - fee);
  return { tier: "partial", refundNaira: refund, withheldNaira: amountPaidNaira - refund, feeNaira: fee };
}
