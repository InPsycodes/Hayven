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
  title: "Hayven: Verified child therapists you can trust",
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
