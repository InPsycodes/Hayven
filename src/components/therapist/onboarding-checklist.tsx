import Link from "next/link";
import { IconCircleCheckFilled, IconCircle, IconClockHour4 } from "@tabler/icons-react";

import type { OnboardingStatus } from "@/lib/therapist/onboarding";

type Step = { done: boolean; pending?: boolean; label: string; href: string };

export function OnboardingChecklist({ status }: { status: OnboardingStatus }) {
  if (status.complete) return null;

  const steps: Step[] = [
    {
      done: status.verified,
      pending: status.verificationPending,
      label: status.verificationPending ? "Verification — under review" : "Get your credentials verified",
      href: "/therapist/profile",
    },
    { done: status.hasAvailability, label: "Add your availability", href: "/therapist/schedule" },
    { done: status.hasBankAccount, label: "Add your payout bank account", href: "/therapist/profile" },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <div className="mt-4 rounded-xl border border-care-line/60 bg-care-surface p-4">
      <p className="text-sm font-medium text-care-ink">
        {remaining} step{remaining === 1 ? "" : "s"} to go before families can book you
      </p>
      <p className="mt-0.5 text-xs text-care-ink-soft">
        Your profile stays hidden from search until all three are done.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className={`flex items-center gap-2 text-sm ${
                step.done ? "text-care-ink-faint" : "text-care-ink hover:text-care-accent"
              }`}
            >
              {step.done ? (
                <IconCircleCheckFilled size={16} className="shrink-0 text-care-sage" />
              ) : step.pending ? (
                <IconClockHour4 size={16} className="shrink-0 text-care-amber" />
              ) : (
                <IconCircle size={16} className="shrink-0 text-care-ink-faint" />
              )}
              <span className={step.done ? "line-through" : ""}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
