// Client-safe. Hayven's commission and the money split. Set 2026-09-02:
// 20% to Hayven, 80% to the therapist, on the gross the parent paid.
// A cancellation's retained amount (after the Paystack fee) splits the
// same way.

export const COMMISSION_RATE = 0.2;

/**
 * A parent can open a dispute up to 7 days after a session ends (see
 * disputes/actions.ts, which imports this rather than keeping its own
 * copy). E1 from the external PRD review, confirmed by reading the code:
 * this used to be independent of EARNING_HOLD_MS (72h), so an earning
 * could clear and get paid out via a Monday payout run days before the
 * dispute window even closed -- money could leave before a dispute
 * describing that same session existed. The hold now has to outlast the
 * window it's meant to leave room for.
 */
export const DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Earnings become payable once the dispute window has fully closed, plus a
 * one-day buffer -- a dispute opened right at the boundary (day 6 into day
 * 7) still needs time to actually flip the earning to "held"
 * (holdBookingEarnings, called from openDispute) before a payout run could
 * otherwise claim it in the same window.
 */
export const EARNING_HOLD_MS = DISPUTE_WINDOW_MS + 24 * 60 * 60 * 1000;

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
