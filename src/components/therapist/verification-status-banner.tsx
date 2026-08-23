import Link from "next/link";
import { IconClock, IconAlertTriangle } from "@tabler/icons-react";

/**
 * Shown on the dashboard for any non-verified state -- a brand-new
 * therapist previously landed on a normal-looking empty dashboard with zero
 * indication their application was still pending, even though the profile
 * page already had this same information in a small status pill. Verified
 * therapists don't get a persistent "you're verified" banner here every day;
 * that state only needs surfacing once, on the profile page.
 */
export function VerificationStatusBanner({ status }: { status: string }) {
  if (status === "rejected") {
    return (
      <div className="flex items-start gap-3 rounded-sm bg-error/10 p-4">
        <IconAlertTriangle size={20} stroke={1.75} className="mt-0.5 shrink-0 text-error-text" />
        <div>
          <p className="text-sm font-medium text-error-text">Your application needs attention</p>
          <p className="mt-0.5 text-sm text-error-text/80">
            Your verification wasn&apos;t approved. See your{" "}
            <Link href="/therapist/profile" className="underline underline-offset-2">
              profile
            </Link>{" "}
            for details, or contact us for help.
          </p>
        </div>
      </div>
    );
  }

  if (status === "pending" || status === "flagged") {
    return (
      <div className="flex items-start gap-3 rounded-sm bg-amber/10 p-4">
        <IconClock size={20} stroke={1.75} className="mt-0.5 shrink-0 text-amber-text" />
        <div>
          <p className="text-sm font-medium text-amber-text">
            {status === "flagged" ? "We need more information" : "Verification pending"}
          </p>
          <p className="mt-0.5 text-sm text-charcoal/70">
            {status === "flagged"
              ? "Our team flagged something on your application -- check your profile for what's needed."
              : "Your credentials are currently being reviewed. This usually takes 2-5 business days. You'll be publicly discoverable once approved."}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
