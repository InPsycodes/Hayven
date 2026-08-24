import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { LogoutButton } from "@/components/shared/logout-button";
import { MfaSection } from "@/components/shared/mfa-section";
import { getSession } from "@/lib/auth/session";
import { getMfaStatus } from "@/lib/auth/mfa-actions";

export default async function SupervisorSettingsPage() {
  const session = await getSession();
  if (!session || !(session.role === "supervisor" || (session.role === "therapist" && session.isSupervisor))) {
    redirect("/login");
  }

  const mfaStatus = await getMfaStatus();

  return (
    <div>
      <DashboardHeader session={session} greeting="Settings" subtext="Your account security" />
      <div className="flex max-w-lg flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        <MfaSection initialStatus={mfaStatus} />
        <LogoutButton className="text-muted-foreground hover:text-charcoal" />
      </div>
    </div>
  );
}
