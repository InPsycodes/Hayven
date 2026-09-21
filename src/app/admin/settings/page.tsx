import { redirect } from "next/navigation";

import { MfaSection } from "@/components/shared/mfa-section";
import { getSession } from "@/lib/auth/session";
import { getMfaStatus } from "@/lib/auth/mfa-actions";

export default async function AdminSettingsPage() {
  // `true`: this is the one page proxy.ts (E8) deliberately leaves reachable
  // for an admin with zero MFA factors enrolled, specifically so they can
  // land here and enroll one -- getSession()'s own admin-must-have-MFA-
  // enrolled check would otherwise redirect them straight back to /login,
  // bricking the exact bootstrap path proxy.ts exists to preserve.
  const session = await getSession(true);
  if (!session || session.role !== "admin") redirect("/login");

  const mfaStatus = await getMfaStatus();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account security.</p>
      </div>

      <div className="max-w-lg px-6 pb-8 md:px-8">
        <MfaSection initialStatus={mfaStatus} />
      </div>
    </div>
  );
}
