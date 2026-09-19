import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Geist_Mono } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { PwaInstallPrompt } from "@/components/shared/pwa-install-prompt";
import { ServiceWorkerUpdater } from "@/components/shared/service-worker-updater";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import "./globals.css";

// Google Analytics is separate from the PostHog product-analytics wrapper in
// src/lib/analytics -- PostHog covers in-app funnels, GA4 exists specifically
// because Search Console, Google Ads, and most SEO tooling expect it. Same
// no-PII posture: no user id, no custom dimensions carrying child/session
// data, GA4's own automatic pageview + Enhanced Measurement events only.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_TITLE = "Hayven: Verified child therapists you can trust";
const DEFAULT_DESCRIPTION =
  "Hayven connects parents with credential-verified child therapists: booking, payments, and progress tracking in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · Hayven",
  },
  description: DEFAULT_DESCRIPTION,
  // Per-page metadata (search, therapist profiles, learn articles, about)
  // overrides this with its own title/description/canonical -- this is only
  // the fallback for pages that don't set their own (and the source Open
  // Graph consumers see if a page's own openGraph block omits a field).
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Hayven",
    type: "website",
    locale: "en_NG",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: "/images/hero-family.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@hayvenmind",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/images/hero-family.jpg"],
  },
  // Populated once a Google Search Console property exists -- paste the
  // "content" value from the HTML-tag verification method into
  // GOOGLE_SITE_VERIFICATION (no code change needed after that). Omitted
  // entirely when unset, rather than emitting an empty meta tag.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hayven",
  },
};

export const viewport: Viewport = {
  themeColor: "#17140F",
  // viewport-fit=cover lets the page draw under the notch/Dynamic
  // Island/home-indicator instead of letterboxing inside the safe area --
  // without it, every env(safe-area-inset-*) already used in
  // message-thread-view.tsx, bottom-tab-nav.tsx, and
  // supervisor-bottom-nav.tsx resolves to 0px and does nothing.
  viewportFit: "cover",
  // Android Chrome otherwise shrinks the *visual* viewport when the
  // software keyboard opens and leaves the *layout* viewport (what
  // 100dvh/fixed-bottom elements measure against) unchanged, so a
  // bottom-pinned composer or CTA stays hidden behind the keyboard.
  // iOS already behaves this way natively.
  interactiveWidget: "resizes-content",
  // Marketing/auth/admin are fixed-light; the two care-theme route groups
  // ((app)/layout.tsx, supervisor/layout.tsx) declare their own "dark"
  // override. Neither follows the OS's prefers-color-scheme -- Hayven's
  // themes are route-based, not OS-toggle-based -- so this is a fixed
  // value per section, not `light dark`.
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        {/* suppressHydrationWarning: only silences attribute mismatches on
            this element (e.g. Grammarly injecting data-gr-ext-installed
            before React hydrates), not real hydration bugs in children. */}
        {/* First focusable element on every page, off-screen until it
            receives keyboard focus -- lets a keyboard/screen-reader user
            jump straight to the actual page content instead of tabbing
            through the full nav (up to 8 links) every single time. Each
            layout's own <main id="main"> is the landing target. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-sm focus:bg-charcoal focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-canvas-white"
        >
          Skip to content
        </a>
        {/* Disabled in dev: an installed service worker can keep serving a
            stale cached page indefinitely, even after a hard refresh, which
            makes live-testing bug fixes on a phone unreliable. Real PWA
            behavior (offline, install) should be verified against a
            production build instead. */}
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
          {children}
          <PwaInstallPrompt />
          <ServiceWorkerUpdater />
          <AnalyticsProvider />
        </SerwistProvider>
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
