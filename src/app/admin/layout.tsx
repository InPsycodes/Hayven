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
  const session = await getSession();

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
