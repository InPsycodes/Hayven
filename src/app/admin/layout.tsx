import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <AdminSidebar session={session} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
