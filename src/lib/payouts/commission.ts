// Client-safe. Hayven's commission and the money split. Set 2026-09-02:
// 20% to Hayven, 80% to the therapist, on the gross the parent paid.
// A cancellation's retained amount (after the Paystack fee) splits the
// same way.

export const COMMISSION_RATE = 0.2;

/** Earnings become payable 72h after the session ends -- room for a dispute. */
export const EARNING_HOLD_MS = 72 * 60 * 60 * 1000;

/** Weekly payout, Mondays. Minimum ₦5,000 -- below that it rolls over. */
export const MIN_PAYOUT_NAIRA = 5000;

export interface EarningSplit {
  gross: number;
  commission: number;
  net: number;
}

export function splitEarning(grossNaira: number): EarningSplit {
  const gross = Math.max(0, Math.round(grossNaira));
  const commission = Math.round(gross * COMMISSION_RATE);
  return { gross, commission, net: gross - commission };
}
