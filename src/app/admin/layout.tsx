import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export const metadata: Metadata = { title: "Admin" };
import {
  getPendingVerificationCount,
  getPendingDeletionRequestCount,
  getPendingRefundCount,
  getOpenSupportRequestCount,
  getPendingSupervisorRequestCount,
} from "@/lib/admin/queries";
import { getOpenDisputeCount } from "@/lib/disputes/queries";
import { getOpenReferralCount } from "@/lib/referrals/queries";
import { isSafeguardingLead } from "@/lib/safeguarding/leads";
import { getOpenSafeguardingConcernCount } from "@/lib/safeguarding/queries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // `true`: this layout wraps every /admin/* page, including /admin/settings
  // -- proxy.ts (E8) already redirects a zero-factor admin to exactly that
  // one page for every other /admin/* request, so in normal operation this
  // only ever renders un-enrolled for that one destination. Without the
  // exemption here, getSession()'s admin-must-have-MFA-enrolled check would
  // reject the session at the layout and bounce to /login before the
  // settings page underneath even gets a chance to render, bricking the
  // bootstrap path both proxy.ts and the settings page itself exist to keep
  // open. Every actual admin action/mutation still calls the unexempted,
  // default getSession() -- this only affects whether the shell (nav, badge
  // counts) renders, not whether anything can be done with it.
  const session = await getSession(true);

  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  const [
    pendingVerificationCount,
    pendingDeletionRequestCount,
    pendingRefundCount,
    openSupportRequestCount,
    pendingSupervisorRequestCount,
    openDisputeCount,
    openReferralCount,
    showSafeguarding,
  ] = await Promise.all([
    getPendingVerificationCount(),
    getPendingDeletionRequestCount(),
    getPendingRefundCount(),
    getOpenSupportRequestCount(),
    getPendingSupervisorRequestCount(),
    getOpenDisputeCount(),
    getOpenReferralCount(),
    isSafeguardingLead(session),
  ]);
  const openSafeguardingCount = showSafeguarding ? await getOpenSafeguardingConcernCount() : 0;

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <AdminSidebar
        session={session}
        counts={{
          "/admin/verification": pendingVerificationCount,
          "/admin/deletion-requests": pendingDeletionRequestCount,
          "/admin/refunds": pendingRefundCount,
          "/admin/disputes": openDisputeCount,
          "/admin/support": openSupportRequestCount,
          "/admin/users": pendingSupervisorRequestCount,
          "/admin/referrals": openReferralCount,
          "/admin/safeguarding": openSafeguardingCount,
        }}
        showSafeguarding={showSafeguarding}
      />
      <main id="main" className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
