import { redirect } from "next/navigation";

import { MfaSection } from "@/components/shared/mfa-section";
import { getSession } from "@/lib/auth/session";
import { getMfaStatus } from "@/lib/auth/mfa-actions";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const mfaStatus = await getMfaStatus();

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F6F4F0]">
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
