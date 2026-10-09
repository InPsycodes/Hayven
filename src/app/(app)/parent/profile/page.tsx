import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { LogoutButton } from "@/components/shared/logout-button";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/shared/profile-form";
import { DeleteAccountSection } from "@/components/shared/delete-account-section";
import { PushNotificationsToggle } from "@/components/shared/push-notifications-toggle";
import { EmailPreferenceToggles } from "@/components/shared/email-preference-toggles";
import { getSession } from "@/lib/auth/session";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import { getRealAccountInfo, getRealPendingDeletionRequest } from "@/lib/account/queries";
import { getMyEmailPreferences } from "@/lib/notifications/preferences-server";
import { ageFromDob } from "@/data/format";

export default async function ParentProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/login");

  const [account, children, pendingDeletionRequest, emailPrefs] = await Promise.all([
    getRealAccountInfo(session.userId),
    getRealChildrenForParent(session.userId),
    getRealPendingDeletionRequest(session.userId),
    getMyEmailPreferences(),
  ]);

  return (
    <div>
      <DashboardHeader session={session} greeting="Profile" subtext="Your account details" />
      <div className="flex max-w-lg flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        <ProfileForm
          initialFullName={account?.fullName ?? session.name}
          initialPhone={account?.phone ?? null}
        />

        <Card className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-heading text-base text-charcoal">Your children</h2>
            <Link
              href="/parent/children"
              className="-m-2 p-2 text-xs font-medium text-terracotta hover:underline"
            >
              Manage
            </Link>
          </div>
          {children.length === 0 ? (
            <p className="text-sm text-muted-foreground">No children added yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {children.map((child) => (
                <li key={child.id} className="text-sm text-charcoal">
                  {child.firstName}, {ageFromDob(child.dateOfBirth)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-heading text-base text-charcoal">Contact Hayven</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            <a href="mailto:hayvenmind@gmail.com" className="text-terracotta hover:underline">
              hayvenmind@gmail.com
            </a>
            <a href="tel:+2348122832137" className="text-charcoal hover:text-terracotta">
              +234 812 283 2137
            </a>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base text-charcoal">Help & FAQs</h2>
            <Link
              href="/help"
              className="-m-2 p-2 text-xs font-medium text-terracotta hover:underline"
            >
              View
            </Link>
          </div>
        </Card>

        <PushNotificationsToggle description="Get alerted on this device for new reports and when your child's session starts or ends." />

        <Card className="p-5">
          <h2 className="font-heading text-base text-charcoal">Notification emails</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Turn off any you don&apos;t want. The notification bell still shows everything.
          </p>
          <EmailPreferenceToggles initial={emailPrefs} />
        </Card>

        <DeleteAccountSection pendingRequest={pendingDeletionRequest} />

        <LogoutButton className="text-muted-foreground hover:text-charcoal" />
      </div>
    </div>
  );
}
