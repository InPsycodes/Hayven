/**
 * How far ahead the public booking flow lets a parent schedule. Also the
 * lower bound: a slot in the past is never offered.
 */
export const BOOKING_WINDOW_DAYS = 60;

/** `{ from, to }` ISO range for "bookable from now": now → now + 60 days. */
export function bookingWindow(): { from: string; to: string } {
  const now = Date.now();
  return {
    from: new Date(now).toISOString(),
    to: new Date(now + BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}
