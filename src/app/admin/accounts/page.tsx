import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  getUsersForAdminPage,
  ADMIN_ACCOUNT_ROLE_FILTERS,
  type AdminAccountRoleFilter,
} from "@/lib/admin/queries";
import { AccountsTable } from "@/components/admin/accounts-table";

interface AdminAccountsPageProps {
  searchParams: Promise<{ page?: string; role?: string; q?: string }>;
}

export default async function AdminAccountsPage({ searchParams }: AdminAccountsPageProps) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const params = await searchParams;
  // Anything unrecognised falls back to the default rather than erroring --
  // these come straight from the URL.
  const role: AdminAccountRoleFilter = (ADMIN_ACCOUNT_ROLE_FILTERS as readonly string[]).includes(params.role ?? "")
    ? (params.role as AdminAccountRoleFilter)
    : "all";
  const search = params.q ?? "";

  const { users, total, page, pageSize } = await getUsersForAdminPage({
    page: Number(params.page),
    role,
    search,
  });

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every account on the platform. Search, filter, suspend, or reset a password.
        </p>
      </div>

      <div className="px-6 pb-8 md:px-8">
        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <AccountsTable
            users={users}
            currentUserId={session.userId}
            total={total}
            page={page}
            pageSize={pageSize}
            role={role}
            search={search.trim()}
          />
        </section>
      </div>
    </div>
  );
}
