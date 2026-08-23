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
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

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
