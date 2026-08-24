import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign up" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // min-h-[calc(...)] instead of min-h-screen -- see the --pwa-reserve
    // comment in globals.css. A plain min-h-screen here doesn't shrink
    // just because the page gained bottom padding for the install toast,
    // which left the "Sign up" link genuinely unclickable underneath it.
    <main id="main" className="flex min-h-[calc(100vh-var(--pwa-reserve,0px))] flex-col md:flex-row">
      {children}
    </main>
  );
}
