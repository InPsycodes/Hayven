"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { capturePageview, initAnalytics } from "@/lib/analytics/client";

// useSearchParams() forces the nearest Suspense boundary to client-render;
// keeping it in its own leaf component stops that from opting the whole tree
// out of static rendering.
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    capturePageview();
    // searchParams is in the deps so a client-side query-only navigation
    // (e.g. changing a search filter) still counts as a pageview.
  }, [pathname, searchParams]);

  return null;
}

/** Mounted once in the root layout. Boots PostHog and tracks route changes. */
export function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}
