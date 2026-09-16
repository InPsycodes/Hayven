/**
 * How far ahead the public booking flow lets a parent schedule. Also the
 * lower bound: a slot in the past is never offered.
 */
export const BOOKING_WINDOW_DAYS = 60;

/**
 * How soon before a slot's start a parent can still book (or reschedule)
 * into it. Without this, "slot start is in the future" alone let someone
 * book or move into a slot starting in 2 minutes -- before the day-before
 * reminder, the 75-minute reminder, and the virtual meeting-link window
 * could ever fire (L-11, production audit 2026-09-03).
 */
export const MIN_BOOKING_NOTICE_MS = 2 * 60 * 60 * 1000;

/** `{ from, to }` ISO range for "bookable from now": now → now + 60 days. */
export function bookingWindow(): { from: string; to: string } {
  const now = Date.now();
  return {
    from: new Date(now).toISOString(),
    to: new Date(now + BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}
