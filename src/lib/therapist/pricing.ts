// Client-safe. The allowed range for a session price (pricing plan,
// 2026-10-11): wide enough for any real fee, narrow enough that a typo
// can't list a session at ₦150 or ₦1,500,000.

export const MIN_SESSION_PRICE = 5000;
export const MAX_SESSION_PRICE = 150000;

/** An error message for a price outside the range, or null when it's fine. */
export function sessionPriceError(price: number): string | null {
  if (!Number.isFinite(price) || price <= 0) return "Please enter a valid session price.";
  if (price < MIN_SESSION_PRICE || price > MAX_SESSION_PRICE) {
    return `Session prices on Hayven are between ₦${MIN_SESSION_PRICE.toLocaleString("en-NG")} and ₦${MAX_SESSION_PRICE.toLocaleString("en-NG")}.`;
  }
  return null;
}
