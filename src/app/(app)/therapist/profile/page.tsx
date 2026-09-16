import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { LogoutButton } from "@/components/shared/logout-button";
import { Card } from "@/components/ui/card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import type { VariantProps } from "class-variance-authority";
import { ProfileForm } from "@/components/shared/profile-form";
import { ProfessionalProfileForm } from "@/components/therapist/professional-profile-form";
import { TherapistPhotoCard } from "@/components/therapist/photo-card";
import { TherapistBankCard } from "@/components/therapist/bank-card";
import { EmailPreferenceToggles } from "@/components/shared/email-preference-toggles";
import { PushNotificationsToggle } from "@/components/shared/push-notifications-toggle";
import { DeleteAccountSection } from "@/components/shared/delete-account-section";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { MfaSection } from "@/components/shared/mfa-section";
import { SupervisorAccessSection } from "@/components/therapist/supervisor-access-section";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId, getMySupervisorRequestStatus } from "@/lib/therapist/queries";
import { getRealAccountInfo, getRealPendingDeletionRequest } from "@/lib/account/queries";
import { getMfaStatus } from "@/lib/auth/mfa-actions";
import { getMyEmailPreferences } from "@/lib/notifications/preferences-server";
import { getBankDetails } from "@/lib/payouts/queries";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const VERIFICATION_LABEL: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending review", tone: "amber" },
  verified: { label: "Verified", tone: "sage" },
  rejected: { label: "Rejected", tone: "error" },
  flagged: { label: "Flagged", tone: "amber" },
};

export default async function TherapistProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const [account, pendingDeletionRequest, mfaStatus, supervisorRequest, emailPrefs, bankDetails] = await Promise.all([
    getRealAccountInfo(session.userId),
    getRealPendingDeletionRequest(session.userId),
    getMfaStatus(),
    getMySupervisorRequestStatus(session.userId),
    getMyEmailPreferences(),
    getBankDetails(therapist.id),
  ]);

  const verification = VERIFICATION_LABEL[therapist.verificationStatus] ?? {
    label: therapist.verificationStatus,
    tone: "grey" as const,
  };

  return (
    <div>
      <DashboardHeader session={session} greeting="Profile" subtext="Your account details" />
      <div className="flex max-w-lg flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        <ProfileForm initialFullName={account?.fullName ?? session.name} initialPhone={account?.phone ?? null} />

        <TherapistPhotoCard name={session.name} photoUrl={therapist.photoUrl} />

        <TherapistBankCard current={bankDetails} />

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base text-charcoal">Verification status</h2>
            <StatusBadge tone={verification.tone}>{verification.label}</StatusBadge>
          </div>
          {therapist.verifiedBadgeLabel && (
            <p className="mt-1 text-sm text-muted-foreground">{therapist.verifiedBadgeLabel}</p>
          )}
        </Card>

        <SupervisorAccessSection isSupervisor={session.isSupervisor} latestRequest={supervisorRequest} />

        <ProfessionalProfileForm
          initialBio={therapist.bio}
          initialPrice={therapist.pricePerSession}
          initialLocation={therapist.location}
          initialSessionTypes={therapist.sessionTypes}
          initialYearsPracticing={therapist.yearsPracticing}
          initialReportTone={therapist.reportTone}
        />

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
            <Link href="/help" className="text-xs font-medium text-terracotta hover:underline">
              View
            </Link>
          </div>
        </Card>

        <PushNotificationsToggle description="Get alerted on this device for new messages, and when a session is about to start or a client reports a problem." />

        <Card className="p-5">
          <h2 className="font-heading text-base text-charcoal">Notification emails</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Turn off any you don&apos;t want. The notification bell still shows everything.
          </p>
          <EmailPreferenceToggles initial={emailPrefs} />
        </Card>

        <MfaSection initialStatus={mfaStatus} />

        <DeleteAccountSection pendingRequest={pendingDeletionRequest} />

        <LogoutButton className="text-muted-foreground hover:text-charcoal" />
      </div>
    </div>
  );
}
