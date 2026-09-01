import type { AppSession } from "@/lib/auth/session";
import { AppRoleSidebar } from "./app-role-sidebar";
import { BottomTabNav } from "./bottom-tab-nav";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getRealActiveClientCountForTherapist, getRealTodaysBookingsForTherapist } from "@/lib/booking/queries";
import { getRealMessageThreadsForTherapist, getRealMessageThreadsForParent } from "@/lib/messages/queries";

function awaitingReplyCount(
  threads: { lastMessage: string | null; lastMessageSenderId: string | null }[],
  userId: string
): number {
  return threads.filter((t) => t.lastMessage !== null && t.lastMessageSenderId !== userId).length;
}

async function getTherapistSidebarCounts(session: AppSession): Promise<Record<string, number>> {
  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return {};

  const [todaysBookings, caseloadCount, threads] = await Promise.all([
    getRealTodaysBookingsForTherapist(therapist.id),
    getRealActiveClientCountForTherapist(therapist.id),
    getRealMessageThreadsForTherapist(therapist.id),
  ]);

  return {
    "/therapist": todaysBookings.length,
    "/therapist/caseload": caseloadCount,
    "/therapist/messages": awaitingReplyCount(threads, session.userId),
  };
}

async function getParentSidebarCounts(session: AppSession): Promise<Record<string, number>> {
  const threads = await getRealMessageThreadsForParent(session.userId);
  return { "/parent/messages": awaitingReplyCount(threads, session.userId) };
}

/**
 * Shared responsive shell for parent/therapist authenticated areas: desktop
 * sidebar and mobile bottom-tabs are both always in the tree, toggled purely
 * via Tailwind responsive visibility -- avoids hydration mismatches and keeps
 * the two nav surfaces from drifting apart.
 */
export async function AppShell({
  session,
  children,
}: {
  session: AppSession;
  children: React.ReactNode;
}) {
  const role = session.role as "parent" | "therapist";
  const counts = role === "therapist" ? await getTherapistSidebarCounts(session) : await getParentSidebarCounts(session);

  return (
    // min-h-[calc(...)], not min-h-screen -- see the --pwa-reserve comment
    // in globals.css. A live audit found the install toast fully blocking
    // the therapist profile page's price input on mobile.
    <div className="care-theme flex min-h-[calc(100vh-var(--pwa-reserve,0px))] w-full flex-col bg-care-bg md:flex-row">
      {/* full-bleed dark backdrop so no light body shows below short pages */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-care-bg" />
      <AppRoleSidebar session={session} role={role} counts={counts} />
      <main id="main" className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      <BottomTabNav session={session} />
    </div>
  );
}
