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
import { TherapistInsuranceCard } from "@/components/therapist/insurance-card";
import { EmailPreferenceToggles } from "@/components/shared/email-preference-toggles";
import { PushNotificationsToggle } from "@/components/shared/push-notifications-toggle";
import { DeleteAccountSection } from "@/components/shared/delete-account-section";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { SupervisorAccessSection } from "@/components/therapist/supervisor-access-section";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId, getMySupervisorRequestStatus } from "@/lib/therapist/queries";
import { getRealAccountInfo, getRealPendingDeletionRequest } from "@/lib/account/queries";
import { getMyEmailPreferences } from "@/lib/notifications/preferences-server";
import { getBankDetails } from "@/lib/payouts/queries";
import { getCurrentInsurance } from "@/lib/therapist/agreement";
import { cn } from "@/lib/utils";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const VERIFICATION_LABEL: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending review", tone: "amber" },
  verified: { label: "Verified", tone: "sage" },
  rejected: { label: "Rejected", tone: "error" },
  flagged: { label: "Flagged", tone: "amber" },
};

type Tab = "practice" | "account";

export default async function TherapistProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "account" ? "account" : "practice";

  const [account, pendingDeletionRequest, supervisorRequest, emailPrefs, bankDetails, insurance] = await Promise.all([
    getRealAccountInfo(session.userId),
    getRealPendingDeletionRequest(session.userId),
    getMySupervisorRequestStatus(session.userId),
    getMyEmailPreferences(),
    getBankDetails(therapist.id),
    getCurrentInsurance(therapist.id),
  ]);

  const verification = VERIFICATION_LABEL[therapist.verificationStatus] ?? {
    label: therapist.verificationStatus,
    tone: "grey" as const,
  };
  // Supervisor access only makes sense for a verified therapist; anyone who
  // already has it, or has a request in, still sees where it stands.
  const showSupervisorAccess =
    therapist.verificationStatus === "verified" || session.isSupervisor || supervisorRequest !== null;

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Profile"
        subtext={tab === "practice" ? "What families see, and how you get paid" : "Your account and notifications"}
      />
      <div className="flex max-w-5xl flex-col gap-5 px-5 py-6 md:px-10 md:py-8">
        <nav aria-label="Profile sections" className="flex gap-1 border-b border-border">
          {(["practice", "account"] as const).map((t) => (
            <Link
              key={t}
              href={t === "practice" ? "/therapist/profile" : "/therapist/profile?tab=account"}
              aria-current={t === tab ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3.5 py-2 text-sm transition-colors",
                t === tab
                  ? "border-terracotta font-medium text-charcoal"
                  : "border-transparent text-muted-foreground hover:text-charcoal"
              )}
            >
              {t === "practice" ? "Practice" : "Account"}
            </Link>
          ))}
        </nav>

        {tab === "practice" ? (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
            <div className="flex min-w-0 flex-col gap-4">
              <ProfessionalProfileForm
                initialBio={therapist.bio}
                initialPrice={therapist.pricePerSession}
                initialLocation={therapist.location}
                initialSessionTypes={therapist.sessionTypes}
                initialYearsPracticing={therapist.yearsPracticing}
                initialReportTone={therapist.reportTone}
              />
              <TherapistPhotoCard name={session.name} photoUrl={therapist.photoUrl} />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-base text-charcoal">Verification</h2>
                  <StatusBadge tone={verification.tone}>{verification.label}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {therapist.verificationStatus === "verified"
                    ? therapist.verifiedBadgeLabel ?? "Your credentials have been checked by Hayven."
                    : therapist.verificationStatus === "pending"
                      ? "We're checking your credentials, usually within 2 to 5 business days."
                      : "We need to talk to you about your application. Check your email or contact Hayven."}
                </p>
              </Card>
              <TherapistInsuranceCard current={insurance} />
              <TherapistBankCard current={bankDetails} />
              {showSupervisorAccess && (
                <SupervisorAccessSection isSupervisor={session.isSupervisor} latestRequest={supervisorRequest} />
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-4">
              <ProfileForm initialFullName={account?.fullName ?? session.name} initialPhone={account?.phone ?? null} />
              <PushNotificationsToggle description="Get alerted on this device for new messages, and when a session is about to start or a client reports a problem." />
              <Card className="p-5">
                <h2 className="font-heading text-base text-charcoal">Notification emails</h2>
                <p className="mt-1 mb-3 text-sm text-muted-foreground">
                  Turn off any you don&apos;t want. The notification bell still shows everything.
                </p>
                <EmailPreferenceToggles initial={emailPrefs} />
              </Card>
            </div>
            <div className="flex min-w-0 flex-col gap-4">
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
              <DeleteAccountSection pendingRequest={pendingDeletionRequest} />
              <LogoutButton className="text-muted-foreground hover:text-charcoal" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
