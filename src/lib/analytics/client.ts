"use client";

import posthog from "posthog-js";

import { sanitizeProps, type AnalyticsEvent } from "./events";

// Public, safe to ship to the browser (it's a write-only ingest key, not an
// admin key). When unset -- local dev, or before the pilot's PostHog project
// exists -- every function here is a no-op, so nothing has to be conditionally
// rendered at the call sites.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

let initialised = false;

function ready(): boolean {
  return Boolean(KEY) && typeof window !== "undefined";
}

/** Idempotent -- safe to call from every provider mount and every track call. */
export function initAnalytics(): void {
  if (initialised || !ready()) return;
  initialised = true;

  posthog.init(KEY as string, {
    // Same-origin reverse proxy (see next.config.ts rewrites) so the strict
    // CSP's connect-src can stay 'self' and ad blockers don't eat the
    // requests. EU ingest region -- the pilot's PostHog project is EU-hosted.
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    // Funnel events only. Autocapture scrapes button/input text into events,
    // which is exactly the free-text leak we've promised not to have.
    autocapture: false,
    capture_pageview: false, // AnalyticsProvider fires these on route change
    capture_pageleave: true,
    disable_session_recording: true,
    persistence: "localStorage+cookie",
    // Last line of defence: strip any query string PostHog would otherwise
    // attach via $current_url / $referrer (discovery search puts the raw
    // query term in the URL, and a parent could type a child's name there).
    sanitize_properties: (properties) => {
      for (const urlKey of ["$current_url", "$referrer", "$referring_domain"]) {
        const raw = properties[urlKey];
        if (typeof raw !== "string") continue;
        try {
          const u = new URL(raw, window.location.origin);
          properties[urlKey] = `${u.origin}${u.pathname}`;
        } catch {
          delete properties[urlKey];
        }
      }
      return properties;
    },
  });
}

export function trackEvent(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (!ready()) return;
  initAnalytics();
  posthog.capture(event, sanitizeProps(props));
}

export function capturePageview(): void {
  if (!ready()) return;
  initAnalytics();
  posthog.capture("$pageview");
}

/** Tie the anonymous browser session to a user. Only role travels as a
 * property -- never name, email, or phone. */
export function identifyUser(userId: string, role?: string): void {
  if (!ready() || !userId) return;
  initAnalytics();
  posthog.identify(userId, sanitizeProps(role ? { role } : undefined));
}

/** Called on sign-out so the next person on a shared device starts clean. */
export function resetAnalytics(): void {
  if (!ready()) return;
  posthog.reset();
}
