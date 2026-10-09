import Link from "next/link";

import { AgreementAcceptButton } from "@/components/therapist/agreement-accept-button";
import { THERAPIST_AGREEMENT } from "@/content/therapist-agreement";
import { getAcceptedAgreementVersions, getCurrentInsurance } from "@/lib/therapist/agreement";
import { insuranceCoverState } from "@/lib/therapist/insurance-status";
import { formatDate } from "@/data/format";

/**
 * Dashboard reminders for the two Therapist Agreement obligations:
 * current professional indemnity insurance, and acceptance of the current
 * agreement version (only once the agreement is adopted). Separate from
 * OnboardingChecklist, which lists only what gates search visibility.
 */
export async function ComplianceNotices({ therapistProfileId }: { therapistProfileId: string }) {
  const [insurance, accepted] = await Promise.all([
    getCurrentInsurance(therapistProfileId),
    THERAPIST_AGREEMENT ? getAcceptedAgreementVersions(therapistProfileId) : Promise.resolve([]),
  ]);

  const coverState = insuranceCoverState(insurance?.expiresOn);
  const insuranceMessage =
    coverState === "missing"
      ? "Upload proof of your professional indemnity insurance. It's required to practise on Hayven."
      : coverState === "expired"
        ? `Your insurance cover ended on ${formatDate(insurance!.expiresOn)}. Upload your renewed certificate.`
        : coverState === "ending_soon"
          ? `Your insurance cover ends on ${formatDate(insurance!.expiresOn)}. Upload your renewed certificate when you have it.`
          : null;

  const needsAgreement =
    THERAPIST_AGREEMENT !== null && !accepted.some((a) => a.version === THERAPIST_AGREEMENT!.version);

  if (!insuranceMessage && !needsAgreement) return null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {insuranceMessage && (
        <Link
          href="/therapist/profile"
          className="rounded-xl border border-care-line/60 bg-care-surface p-4 text-sm text-care-ink transition-colors hover:text-care-accent"
        >
          {insuranceMessage}
        </Link>
      )}
      {needsAgreement && THERAPIST_AGREEMENT && (
        <div className="flex flex-col gap-3 rounded-xl border border-care-line/60 bg-care-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-care-ink">
            {accepted.length > 0 ? "The Therapist Agreement has changed. " : ""}
            Please read and accept the{" "}
            <Link href="/therapist-agreement" target="_blank" className="font-medium underline">
              Therapist Agreement
            </Link>{" "}
            (version {THERAPIST_AGREEMENT.version}, effective {formatDate(THERAPIST_AGREEMENT.effectiveDate)}).
          </p>
          <AgreementAcceptButton version={THERAPIST_AGREEMENT.version} />
        </div>
      )}
    </div>
  );
}
