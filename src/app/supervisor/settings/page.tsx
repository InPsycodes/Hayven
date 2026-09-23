import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { EmailPreferenceToggles } from "@/components/shared/email-preference-toggles";
import { LogoutButton } from "@/components/shared/logout-button";
import { MfaSection } from "@/components/shared/mfa-section";
import { PushNotificationsToggle } from "@/components/shared/push-notifications-toggle";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getMfaStatus } from "@/lib/auth/mfa-actions";
import { getMyEmailPreferences } from "@/lib/notifications/preferences-server";

export default async function SupervisorSettingsPage() {
  const session = await getSession();
  if (!session || !(session.role === "therapist" && session.isSupervisor)) {
    redirect("/login");
  }

  const [mfaStatus, emailPrefs] = await Promise.all([getMfaStatus(), getMyEmailPreferences()]);

  return (
    <div>
      <DashboardHeader session={session} greeting="Settings" subtext="Notifications and account security" />
      <div className="flex max-w-lg flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        {/* A supervisor is always a therapist (E9), and notification
            preferences are one row per user -- these are the same settings
            as on the therapist profile, shown here too so a supervisor who
            works from this portal doesn't have to know to look there. */}
        <PushNotificationsToggle description="Get alerted on this device for new messages, upcoming sessions, and reports waiting for your approval." />

        <Card className="p-5">
          <h2 className="font-heading text-base text-charcoal">Notification emails</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Turn off any you don&apos;t want. The notification bell still shows everything.
          </p>
          <EmailPreferenceToggles initial={emailPrefs} />
        </Card>

        <MfaSection initialStatus={mfaStatus} />
        <LogoutButton className="text-muted-foreground hover:text-charcoal" />
      </div>
    </div>
  );
}
