import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/monitoring/scrub-sentry-event";

// Same config as sentry.server.config.ts, for the edge runtime (middleware) --
// kept as a separate file per Next.js/Sentry convention since the two
// runtimes are instrumented independently.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
