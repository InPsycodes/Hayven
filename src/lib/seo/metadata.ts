/**
 * Shared metadata helpers for marketing/public pages -- keeps the canonical
 * URL and Open Graph boilerplate in one place instead of re-typed per page
 * (and re-typed slightly differently each time, which is how canonical tags
 * silently go missing on new pages).
 *
 * SITE_URL is also this whole app's single canonical base-URL source --
 * SEC-03, pre-launch audit (P2): 9 separate files used to each redefine
 * `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"` locally. A
 * reasonable dev convenience, but it meant a production misconfiguration
 * (the env var unset on a new deploy environment, a typo'd var name) would
 * fail *silently* rather than loudly -- password-reset links, the Paystack
 * payment callback URL, and unsubscribe links would all have silently
 * pointed at localhost for real users. Centralized here and thrown loudly
 * at import time instead, in production only (dev/test/CI builds still
 * fall back so `next dev`/`next build` don't need the var set).
 */

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL is not set. Password-reset links, the payment callback URL, and unsubscribe " +
          "links all depend on it being correct in production -- refusing to silently fall back to localhost."
      );
    }
    return "http://localhost:3000";
  }
  return raw.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Hayven";

/** Absolute URL for a site-relative path, e.g. absoluteUrl("/search") -> "https://hayven.com.ng/search". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * `alternates.canonical` for a static or dynamic page. Pass the path only --
 * never include a query string here. A page with filter/sort query params
 * (like /search) should still canonical to its bare path so Google
 * consolidates ranking signal onto one URL instead of splitting it across
 * every filter combination.
 */
export function canonicalFor(path: string) {
  return { canonical: absoluteUrl(path) };
}

/**
 * A search-results-style page (many query-param combinations of the same
 * underlying content) should stay crawlable -- so link equity still flows
 * through it -- without being indexed under every combination, which would
 * otherwise register as near-duplicate content. Apply only when the page is
 * rendering a filtered view; the bare, unfiltered page stays indexable.
 */
export const NOINDEX_FOLLOW = { index: false, follow: true };
