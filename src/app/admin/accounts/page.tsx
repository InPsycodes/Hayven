import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getAllUsersForAdmin } from "@/lib/admin/queries";
import { AccountsTable } from "@/components/admin/accounts-table";

export default async function AdminAccountsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const users = await getAllUsersForAdmin();

  return (
    <div className="min-h-screen overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every account on the platform. Search, filter, suspend, or reset a password.
        </p>
      </div>

      <div className="px-6 pb-8 md:px-8">
        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.05),0_14px_34px_-22px_rgba(26,26,26,.3)] md:p-6">
          <AccountsTable users={users} currentUserId={session.userId} />
        </section>
      </div>
    </div>
  );
}
