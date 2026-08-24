import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Geist_Mono } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import { PwaInstallPrompt } from "@/components/shared/pwa-install-prompt";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Hayven: Verified child therapists you can trust",
    template: "%s · Hayven",
  },
  description:
    "Hayven connects parents with credential-verified child therapists: booking, payments, and progress tracking in one place.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hayven",
  },
};

export const viewport: Viewport = {
  themeColor: "#17140F",
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
        </SerwistProvider>
      </body>
    </html>
  );
}
