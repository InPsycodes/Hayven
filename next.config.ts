import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import { withSentryConfig } from "@sentry/nextjs";

// Derived once at build time so img-src can allow the actual Supabase
// project's storage host (therapist photos, credential previews) without
// hardcoding a project ref -- falls back to nothing if the env var is
// missing so config evaluation never throws.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "";
  }
})();

// The Sentry browser SDK reports errors via fetch/sendBeacon straight from
// the client to this host -- without it in connect-src, the strict CSP
// below would silently swallow every client-side error report.
const sentryHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").host;
  } catch {
    return "";
  }
})();

// Next.js's App Router streams RSC payloads via inline `<script>` tags with
// no nonce/hash by default, so script-src can't drop 'unsafe-inline'
// without a nonce-plumbing change (a bigger, separate hardening step) --
// every other directive stays strict. Radix UI (Select, Dialog, Popover,
// etc.) sets inline positioning styles at runtime, so style-src needs the
// same allowance. Only applied in production: the dev server's HMR
// websocket and eval-based source maps would otherwise break `next dev`.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""}${sentryHost ? ` https://${sentryHost}` : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  // Lets the dev server's hot-reload/dev-tooling connections work when
  // testing from a phone on the same network (http://<lan-ip>:3000) instead
  // of localhost -- without this, Next blocks that connection by default,
  // which can leave the dev-mode client runtime partially broken on that
  // device (some interactions silently fail while others still work).
  allowedDevOrigins: ["192.168.8.133"],

  // Next's own default cap on a Server Action's request body is 1MB --
  // below the credential-upload flow's own 2.5MB check (MAX_CREDENTIAL_
  // FILE_BYTES in src/lib/therapist/actions.ts), so a real ~1.5-2MB scanned
  // certificate photo hit Next's framework-level limit first and crashed to
  // a generic error page instead of ever reaching the app's own check --
  // confirmed via a live pre-launch audit. 3mb leaves headroom above 2.5MB
  // for multipart's own boundary/header overhead per Next's own guidance.
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },

  // Therapist profile photos live in the public `avatars` Supabase Storage
  // bucket -- let next/image optimise them. Same host the CSP img-src
  // already allows.
  images: supabaseHost
    ? {
        remotePatterns: [
          { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
        ],
      }
    : undefined,

  // PostHog is proxied through this app at /ingest/* so the strict CSP's
  // connect-src can stay 'self' (no third-party host to allowlist) and ad
  // blockers don't drop the events. EU ingest region. Only wired up when the
  // key is set, so local/dev builds without PostHog skip the rewrite.
  async rewrites() {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return [];
    return [
      { source: "/ingest/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ];
  },
  // PostHog's asset paths must reach it exactly as sent -- Next's default
  // trailing-slash redirect would mangle them.
  skipTrailingSlashRedirect: true,

  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source map upload needs SENTRY_AUTH_TOKEN -- without it this step is
  // skipped with a warning, not a failed build, so it's fine to leave unset
  // until it's actually configured.
  silent: !process.env.CI,
});
