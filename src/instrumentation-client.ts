import * as Sentry from "@sentry/nextjs";

// Deliberately no replayIntegration/feedbackIntegration and no
// enableLogs -- this app renders session notes, reports, and other
// clinical text client-side, and neither screen replay nor console-log
// forwarding should risk capturing any of it. Error + basic performance
// data only.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
