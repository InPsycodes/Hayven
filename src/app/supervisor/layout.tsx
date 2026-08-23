import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { SupervisorSidebar } from "@/components/layout/supervisor-sidebar";
import { getMySupervisedTherapistCount } from "@/lib/supervisor/queries";

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "supervisor") {
    redirect("/login");
  }

  const teamCount = await getMySupervisedTherapistCount(session.userId);

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <SupervisorSidebar session={session} teamCount={teamCount} />
      <main id="main" className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
