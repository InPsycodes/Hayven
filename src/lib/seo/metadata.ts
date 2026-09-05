/**
 * Shared metadata helpers for marketing/public pages -- keeps the canonical
 * URL and Open Graph boilerplate in one place instead of re-typed per page
 * (and re-typed slightly differently each time, which is how canonical tags
 * silently go missing on new pages).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
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
