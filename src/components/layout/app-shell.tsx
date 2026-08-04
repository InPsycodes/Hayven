import type { AppSession } from "@/lib/auth/session";
import { SidebarNav } from "./sidebar-nav";
import { BottomTabNav } from "./bottom-tab-nav";

/**
 * Shared responsive shell for parent/therapist authenticated areas: desktop
 * sidebar and mobile bottom-tabs are both always in the tree, toggled purely
 * via Tailwind responsive visibility -- avoids hydration mismatches and keeps
 * the two nav surfaces from drifting apart.
 */
export function AppShell({
  session,
  children,
}: {
  session: AppSession;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <SidebarNav session={session} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BottomTabNav session={session} />
    </div>
  );
}
