"use client";

import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";

import { sanitizeProps, type AnalyticsEvent } from "./events";
import { sanitizePath, sanitizeUrl, scrubCapture } from "./url-privacy";

// Public, safe to ship to the browser (it's a write-only ingest key, not an
// admin key). When unset -- local dev, or before the pilot's PostHog project
// exists -- every function here is a no-op, so nothing has to be conditionally
// rendered at the call sites.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// GA4 gets the same funnel events as PostHog, through the same
// sanitizeProps allowlist -- one call site enforces the no-PII rule for both
// destinations instead of trusting every call site twice over. Silently a
// no-op when GA isn't configured (see layout.tsx / next.config.ts).
const GA_ENABLED = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

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
    // Last line of defence on every outgoing event: drop query strings (a
    // search URL carries what a parent typed, which can be a child's name)
    // and replace ids in paths (/parent/children/<id>), across the event's
    // properties AND the person properties PostHog sets once
    // ($initial_current_url, $initial_referrer), which the old
    // sanitize_properties hook never saw. See url-privacy.ts.
    before_send: (capture) => (capture ? scrubCapture(capture, window.location.origin) : capture),
  });
}

export function trackEvent(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  const clean = sanitizeProps(props);
  if (ready()) {
    initAnalytics();
    posthog.capture(event, clean);
  }
  if (GA_ENABLED) {
    try {
      sendGAEvent("event", event, clean);
    } catch {
      // GoogleAnalytics not mounted yet (e.g. called before hydration) -- a
      // dropped marketing event is never worth surfacing an error over.
    }
  }
}

export function capturePageview(): void {
  if (ready()) {
    initAnalytics();
    posthog.capture("$pageview");
  }
  if (GA_ENABLED) {
    // @next/third-parties's <GoogleAnalytics> only fires gtag's own
    // automatic page_view once, on first script load -- it doesn't listen
    // for client-side (App Router) navigations, so every route change after
    // the first needs an explicit page_view or GA under-counts pageviews
    // for the exact acquisition/Search Console reports this integration
    // exists for.
    try {
      // Never the raw href: same URL rules as PostHog (no query string,
      // no ids in the path).
      sendGAEvent("event", "page_view", {
        page_location: sanitizeUrl(window.location.href) ?? window.location.origin,
        page_path: sanitizePath(window.location.pathname),
      });
    } catch {
      // not mounted yet -- see the note in trackEvent.
    }
  }
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
