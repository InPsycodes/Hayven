/**
 * Fixture clock. The demo data (the 5 seed therapists' availability, their
 * historical + upcoming bookings, message and notification timestamps) used
 * to be pinned to the week of 2026-08-03, so it silently went stale -- every
 * "open" slot drifted into the past and the booking flow's now..+60d window
 * filtered them all out.
 *
 * Everything here is expressed as a day-offset from *this* week's Monday
 * (UTC), so the demo stays coherent no matter when it's viewed: negative
 * offsets are history, positive offsets are upcoming.
 */
const DAY_MS = 86_400_000;

function currentWeekMondayUtc(): Date {
  const now = new Date();
  const dow = now.getUTCDay(); // 0 = Sun … 6 = Sat
  const toMonday = dow === 0 ? -6 : 1 - dow;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + toMonday));
}

const weekMonday = currentWeekMondayUtc();

/** `YYYY-MM-DD` for (this week's Monday + dayOffset). */
export function fxDate(dayOffset: number): string {
  return new Date(weekMonday.getTime() + dayOffset * DAY_MS).toISOString().slice(0, 10);
}

/** Full ISO timestamp at a given UTC hour on (this week's Monday + dayOffset). */
export function fxTs(dayOffset: number, hourUtc = 8, minute = 0): string {
  const d = new Date(weekMonday.getTime() + dayOffset * DAY_MS);
  d.setUTCHours(hourUtc, minute, 0, 0);
  return d.toISOString();
}
