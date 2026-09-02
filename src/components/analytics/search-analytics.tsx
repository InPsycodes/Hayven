"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

/**
 * Fires `search_performed` once per distinct discovery search. Rendered by
 * the (server) search page with the coarse, already-safe params -- never the
 * free-text `query` term, which could contain a child's name.
 */
export function SearchAnalytics({
  count,
  sort,
  sessionType,
  specialty,
}: {
  count: number;
  sort?: string;
  sessionType?: string;
  specialty?: string;
}) {
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.searchPerformed, {
      count,
      sort: sort ?? "recommended",
      session_type: sessionType,
      specialty,
    });
  }, [count, sort, sessionType, specialty]);

  return null;
}
