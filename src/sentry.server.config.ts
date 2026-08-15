import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/monitoring/scrub-sentry-event";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Never auto-attach IP/cookies/headers as user context -- keep error
  // reports to the exception itself plus what scrubSentryEvent lets through.
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
