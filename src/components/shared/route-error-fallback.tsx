"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";

/**
 * Shared body for every route-level error.tsx -- keeps one failing section
 * (a slow query throwing, a bad response) from blanking the whole app shell,
 * since Next scopes each error.tsx to its own segment and leaves ancestor
 * layouts (nav, sidebar) mounted and interactive.
 */
export function RouteErrorFallback({
  error,
  reset,
  label = "this page",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  label?: string;
}) {
  // Next raises this client-side when a request that should have returned
  // app data got a login page instead -- i.e. the session ended or changed
  // (signing in as someone else in another tab replaces the shared cookie).
  // Expected, not a bug, so it is not reported.
  const sessionChanged = /unexpected response/i.test(error.message ?? "");

  useEffect(() => {
    if (!sessionChanged) Sentry.captureException(error);
  }, [error, sessionChanged]);

  if (sessionChanged) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <h2 className="font-heading text-lg text-charcoal">Your session has changed</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          You may have been signed out, or signed in as someone else in another tab. Please log in again to
          continue.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <a href="/login">Log in again</a>
          </Button>
          <Button variant="outline" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="font-heading text-lg text-charcoal">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        We couldn&apos;t load {label}. We&apos;ve been notified -- please try again.
      </p>
      <Button onClick={() => reset()} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
