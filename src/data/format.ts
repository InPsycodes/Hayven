// Every Hayven user is in Nigeria. Africa/Lagos is UTC+1 year-round (no
// DST), so display always renders in Lagos time regardless of where the
// browser or server happens to be, instead of relying on ambient timezone
// (which differs between client and server rendering and caused real times
// to display an hour apart depending on which one rendered them).
export const LAGOS_TZ = "Africa/Lagos";
const LAGOS_OFFSET_HOURS = 1;

/** Converts a Lagos wall-clock date+time (as typed into a form, e.g. a therapist setting availability) to a true UTC ISO string for storage. */
export function lagosWallClockToUtcIso(date: string, time: string): string {
  const naiveUtc = new Date(`${date}T${time}:00Z`);
  return new Date(naiveUtc.getTime() - LAGOS_OFFSET_HOURS * 60 * 60 * 1000).toISOString();
}

/**
 * Converts a true UTC instant into a "wall-clock proxy" Date whose UTC
 * getters (getUTCDate, getUTCDay, getUTCHours, ...) read out the Lagos
 * calendar values directly -- lets week/day/hour bucketing logic use plain
 * UTC getters instead of threading a timezone through every comparison.
 * Only valid for fixed-offset, non-DST zones like Africa/Lagos; never mix
 * a proxy Date with a real UTC instant without converting one of them.
 */
export function toLagosWallClock(date: Date): Date {
  return new Date(date.getTime() + LAGOS_OFFSET_HOURS * 60 * 60 * 1000);
}

/** Inverse of toLagosWallClock -- converts a wall-clock proxy Date back into the true UTC instant it represents. */
export function fromLagosWallClock(lagosWallClock: Date): Date {
  return new Date(lagosWallClock.getTime() - LAGOS_OFFSET_HOURS * 60 * 60 * 1000);
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: LAGOS_TZ,
    ...(opts ?? { month: "short", day: "numeric", year: "numeric" }),
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: LAGOS_TZ });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: LAGOS_TZ });
}

export function formatDateTime(iso: string): string {
  return `${formatShortDate(iso)} · ${formatTime(iso)}`;
}

export function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: LAGOS_TZ });
}

export function ageFromDob(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function initialsFromName(name: string): string {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter((char): char is string => !!char && /\p{L}/u.test(char))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return initials || "?";
}
