import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import {
  getPendingVerificationCount,
  getPendingDeletionRequestCount,
  getPendingRefundCount,
  getOpenSupportRequestCount,
} from "@/lib/admin/queries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  const [pendingVerificationCount, pendingDeletionRequestCount, pendingRefundCount, openSupportRequestCount] =
    await Promise.all([
      getPendingVerificationCount(),
      getPendingDeletionRequestCount(),
      getPendingRefundCount(),
      getOpenSupportRequestCount(),
    ]);

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <AdminSidebar
        session={session}
        counts={{
          "/admin/verification": pendingVerificationCount,
          "/admin/deletion-requests": pendingDeletionRequestCount,
          "/admin/refunds": pendingRefundCount,
          "/admin/support": openSupportRequestCount,
        }}
      />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
