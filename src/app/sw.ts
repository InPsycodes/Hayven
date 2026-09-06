/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Everything behind a login: the four role dashboards, the login-gated help
// centre, the therapist onboarding steps, and the whole booking flow.
const AUTHED_PATH =
  /^\/(parent|therapist|admin|supervisor|book|help|signup\/(credentials|profile|complete))(\/|$)/;

// The Serwist default cache uses NetworkFirst (24h cache, 10s network
// timeout) for page HTML, RSC payloads, and same-origin /api/* responses.
// The SW cache is keyed per-origin, not per-user -- so a cached
// /parent/children/[id] page could be served to a different person on a
// shared installed app while offline (or on a slow connection), completely
// bypassing the server-side RLS that is the real access boundary. It would
// also show day-old clinical data as if current. So: never cache anything
// authenticated. Public marketing / Learn Center pages and static assets
// keep the default behaviour below (public data, safe to serve stale, and
// where offline access is actually worth something).
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && (url.pathname.startsWith("/api/") || AUTHED_PATH.test(url.pathname)),
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Real OS-level push notifications (see src/lib/notifications/push.ts for
// the send side). Payload is always JSON: { title, body, url }.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string };
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const { title = "Hayven", body = "", url = "/" } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/192",
      // Monochrome, transparent-background mark -- Android masks the badge
      // to its alpha channel, so the filled app icon would show as a blob.
      badge: "/icons/badge",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";
  event.waitUntil(self.clients.openWindow(url));
});
