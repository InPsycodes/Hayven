/**
 * URLs are the one place family details can slip into analytics despite the
 * sanitizeProps allowlist: a search URL carries what a parent typed (which
 * can be a child's name), and app paths carry internal ids that map back to
 * a specific child, message thread or booking. Every URL that leaves the app
 * goes through sanitizeUrl: query string and fragment dropped, UUID path
 * segments replaced with ":id". Audit 2026-10-29 (F-08, F-09, F-10).
 */

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizePath(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => (UUID_SEGMENT.test(segment) ? ":id" : segment))
    .join("/");
}

/** origin + id-free path, no query or fragment. Returns null for anything that isn't a parseable URL. */
export function sanitizeUrl(raw: string, base?: string): string | null {
  try {
    const u = new URL(raw, base);
    return `${u.origin}${sanitizePath(u.pathname)}`;
  } catch {
    return null;
  }
}

// PostHog property names that hold a URL, a path, or a referrer -- including
// the person properties it sets once ($initial_current_url, $initial_referrer,
// $initial_pathname) outside the event's own properties.
const URL_KEY = /(url|referrer|href)$/i;
const PATH_KEY = /pathname$/i;

function scrubBag(bag: Record<string, unknown> | undefined, base?: string): void {
  if (!bag) return;
  for (const [key, value] of Object.entries(bag)) {
    if (typeof value !== "string") continue;
    if (PATH_KEY.test(key)) {
      bag[key] = sanitizePath(value.split(/[?#]/)[0]);
    } else if (URL_KEY.test(key) || key === "$referring_domain") {
      if (key === "$referring_domain" || value === "$direct") continue; // a bare domain or PostHog's "$direct" marker
      const clean = sanitizeUrl(value, base);
      if (clean) bag[key] = clean;
      else delete bag[key];
    }
  }
}

/** Shape of the parts of a PostHog capture this touches. */
export interface CaptureLike {
  properties?: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
}

/** Scrubs every URL-valued property in an outgoing PostHog capture, in place. */
export function scrubCapture<T extends CaptureLike>(capture: T, base?: string): T {
  scrubBag(capture.properties, base);
  scrubBag(capture.$set, base);
  scrubBag(capture.$set_once, base);
  // Person properties can also ride inside properties.$set / $set_once.
  scrubBag(capture.properties?.$set as Record<string, unknown> | undefined, base);
  scrubBag(capture.properties?.$set_once as Record<string, unknown> | undefined, base);
  return capture;
}
