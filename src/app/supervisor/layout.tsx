import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { SupervisorSidebar } from "@/components/layout/supervisor-sidebar";
import { getMySupervisedTherapistCount } from "@/lib/supervisor/queries";

export const metadata: Metadata = { title: "Supervisor" };

// Overrides the root layout's "light" -- this route is the warm-dark
// .care-theme portal too, same as (app)/layout.tsx.
export const viewport: Viewport = {
  themeColor: "#17140F",
  colorScheme: "dark",
};

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // A therapist with is_supervisor granted keeps full access to their own
  // /therapist dashboard too -- see migration 0054 and src/proxy.ts, which
  // gates this same route the same way.
  if (!session || !(session.role === "supervisor" || (session.role === "therapist" && session.isSupervisor))) {
    redirect("/login");
  }

  const teamCount = await getMySupervisedTherapistCount(session.userId);

  return (
    <div className="care-theme flex min-h-dvh w-full flex-col bg-care-bg md:flex-row">
      <div aria-hidden className="fixed inset-0 -z-10 bg-care-bg" />
      <SupervisorSidebar session={session} teamCount={teamCount} />
      <main id="main" className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
