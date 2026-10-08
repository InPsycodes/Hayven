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

// Google Analytics (gtag.js) is the only script this app loads straight from
// a third party rather than through a same-origin proxy (unlike PostHog's
// /ingest rewrite) -- @next/third-parties has no proxy option, and GA's
// collect endpoint is regionalised, so a fixed host allowlist would drift.
// Gated on the same env var that renders <GoogleAnalytics> in layout.tsx, so
// a deploy without it configured keeps the tighter CSP.
const gaHosts = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  ? { script: "https://www.googletagmanager.com", connect: "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com" }
  : { script: "", connect: "" };

// Next.js's App Router streams RSC payloads via inline `<script>` tags with
// no nonce/hash by default, so script-src can't drop 'unsafe-inline'
// without a nonce-plumbing change (a bigger, separate hardening step) --
// every other directive stays strict. Radix UI (Select, Dialog, Popover,
// etc.) sets inline positioning styles at runtime, so style-src needs the
// same allowance. Only applied in production: the dev server's HMR
// websocket and eval-based source maps would otherwise break `next dev`.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${gaHosts.script ? ` ${gaHosts.script}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""}${sentryHost ? ` https://${sentryHost}` : ""}${gaHosts.connect ? ` ${gaHosts.connect}` : ""}`,
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
  // No functional purpose -- just stops every response from announcing the
  // framework (and loosely its patch level) to anyone probing the site.
  poweredByHeader: false,

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

  // PDF report download (src/app/api/reports/[reportId]/pdf). pdfkit stays
  // an external package (it pulls in fontkit/brotli, which don't bundle
  // cleanly), and the bundled fonts are read from disk by filename at
  // runtime, which file tracing can't see -- so they are listed explicitly.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/reports/[reportId]/pdf": ["./src/assets/fonts/**/*"],
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
  // SEC-01, pre-launch audit (P2): withSentryConfig implicitly turns on
  // productionBrowserSourceMaps so it has something to upload -- without
  // this, those .js.map files would sit in the public .next/static output
  // right alongside the JS they describe, leaking original file paths,
  // variable/function names, and business logic structure to anyone who
  // requests them. deleteSourcemapsAfterUpload already defaults to true in
  // the installed SDK version (confirmed against its own type
  // definitions), so this is currently a no-op in practice -- pinned
  // explicitly anyway so it can't silently regress on a future SDK
  // upgrade, and so this doesn't depend on a reader checking the SDK's own
  // source to know it's intentional.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
