import "server-only";

import { sanitizeProps, type AnalyticsEvent } from "./events";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// Server events go straight to PostHog (no CSP in play server-side), so this
// is the real EU ingest host, not the /ingest proxy. Overridable for a
// self-hosted instance.
const HOST = (process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com").replace(/\/+$/, "");

/**
 * Fire-and-forget server-side capture. Never throws and never blocks a
 * request path for long -- an analytics outage must not break a payment
 * finalize, a report publish, or the notifications cron.
 *
 * `distinctId` must be the user's id (the same value the browser passes to
 * identifyUser), so server events land on the same person as their
 * client-side funnel steps.
 */
export async function captureServer(
  distinctId: string,
  event: AnalyticsEvent,
  props?: Record<string, unknown>
): Promise<void> {
  if (!KEY || !distinctId) return;
  try {
    await fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: distinctId,
        properties: { ...sanitizeProps(props), $lib: "hayven-server" },
        timestamp: new Date().toISOString(),
      }),
      // Analytics is never worth hanging a user's request on.
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    console.error("captureServer failed", event, err);
  }
}
