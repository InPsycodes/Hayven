"use client";

import { RouteErrorFallback } from "@/components/shared/route-error-fallback";

export default function TherapistError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorFallback error={error} reset={reset} label="this page" />;
}
