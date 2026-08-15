import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Strips anything that could leak a live session out of an error report --
 * Next's onRequestError hook attaches request headers by default, which on
 * this app includes the Supabase auth cookie. Sentry must never become a
 * second place a session token could be read from. Shared between the
 * server and edge Sentry configs so they can't quietly drift apart.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request?.headers) {
    delete event.request.headers["cookie"];
    delete event.request.headers["Cookie"];
    delete event.request.headers["authorization"];
    delete event.request.headers["Authorization"];
  }
  if (event.request?.cookies) {
    delete event.request.cookies;
  }
  return event;
}
