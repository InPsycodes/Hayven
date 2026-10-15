/**
 * Product analytics -- shared, client-safe. No imports, no `server-only`, so
 * both the browser wrapper (./client) and the server wrapper (./server) can
 * pull from here.
 *
 * The promise to families is that no child or health data ever leaves the
 * app for PostHog: not a child's name, date of birth, presenting concern,
 * session notes, or any report text. `sanitizeProps` below is the single
 * chokepoint that enforces that -- every event, from every call site,
 * client or server, goes through it. Call sites are trusted to pass the
 * right *shape*; they are not trusted to never pass something sensitive.
 */

export const ANALYTICS_EVENTS = {
  /** Parent/therapist submitted the signup form (fired anonymously, pre-identify). */
  signupStarted: "signup_started",
  /** Account row created (server-side, attributed to the new user id). */
  signupCompleted: "signup_completed",
  /** A discovery search returned results. */
  searchPerformed: "search_performed",
  /** Parent reached the payment step and clicked pay. */
  bookingStarted: "booking_started",
  /** Flutterwave payment confirmed for a booking (server-side). */
  bookingPaid: "booking_paid",
  /** A booked session's end time passed and it was marked completed (server-side, cron). */
  sessionCompleted: "session_completed",
  /** A therapist published a session report to a parent (server-side). */
  reportPublished: "report_published",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * The only property keys any event is allowed to carry. Anything else is
 * dropped before the event leaves the app. Keep this list to coarse,
 * non-identifying dimensions -- roles, funnel steps, enums, counts, money
 * amounts, coarse timing. Never add a key that could hold a name, a note,
 * a free-text reason, an email, a phone number, or an opaque id that maps
 * back to a specific child.
 */
export const ALLOWED_PROP_KEYS: ReadonlySet<string> = new Set([
  "role", // "parent" | "therapist"
  "step", // funnel step label, e.g. "submit"
  "result", // "ok" | "error" | "needs_confirmation"
  "method", // e.g. "password"
  "session_type", // "virtual" | "in_person"
  "specialty", // specialty slug/name shown in a filter
  "sort", // discovery sort key
  "amount_naira", // integer naira, never kobo
  "count", // result counts, list lengths
  "days_ahead", // coarse lead time
  "tier", // refund/plan tier enum
  "source", // internal enum for where an earning/event originated
]);

const MAX_STRING_LEN = 48;

/** Strip every key not in ALLOWED_PROP_KEYS; drop long strings and non-primitives. */
export function sanitizeProps(props?: Record<string, unknown> | null): Record<string, unknown> {
  if (!props) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROP_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_STRING_LEN) continue;
      clean[key] = trimmed;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      clean[key] = value;
    } else if (typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return clean;
}
