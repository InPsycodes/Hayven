import { redirect } from "next/navigation";

import { ChangePasswordSection } from "@/components/shared/change-password-section";
import { ProfileForm } from "@/components/shared/profile-form";
import { getRealAccountInfo } from "@/lib/account/queries";
import { getSession } from "@/lib/auth/session";
import { hasPasswordSignIn } from "@/lib/auth/password";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const [account, hasPassword] = await Promise.all([getRealAccountInfo(session.userId), hasPasswordSignIn()]);

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your own account details and password.</p>
      </div>

      <div className="flex max-w-lg flex-col gap-4 px-6 pb-8 md:px-8">
        <ProfileForm initialFullName={account?.fullName ?? session.name} initialPhone={account?.phone ?? null} />
        <ChangePasswordSection hasPassword={hasPassword} />
      </div>
    </div>
  );
}
