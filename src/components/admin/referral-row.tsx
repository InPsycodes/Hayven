"use client";

import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { advanceReferralStatus, type ReferralStatus } from "@/lib/referrals/actions";
import { formatDateTime } from "@/data/format";
import type { RealReferral } from "@/lib/referrals/queries";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { key: ReferralStatus; label: string; tone: "grey" | "amber" | "rust" | "sage" }[] = [
  { key: "received", label: "Received", tone: "grey" },
  { key: "family_contacted", label: "Family contacted", tone: "amber" },
  { key: "assessment_scheduled", label: "Assessment scheduled", tone: "rust" },
  { key: "care_started", label: "Care started", tone: "sage" },
];

export function ReferralRow({ referral }: { referral: RealReferral }) {
  const [status, setStatus] = useState(referral.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const handleSetStatus = guard((next: ReferralStatus) => {
    if (next === status) return;
    setError(null);
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const result = await advanceReferralStatus(referral.id, next);
      if (!result.ok) {
        setStatus(prev);
        setError(result.error);
      }
      reset();
    });
  });

  return (
    <div className="flex flex-col gap-2.5 px-3 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-charcoal">
            {referral.childName}
            {referral.childAge !== null ? `, ${referral.childAge}` : ""}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              &middot; {referral.referenceCode}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {referral.referrerName}
            {referral.referrerFacility ? ` · ${referral.referrerFacility}` : ""} &middot; {referral.referrerContact}
          </p>
        </div>
        <span className="whitespace-nowrap text-[11px] text-muted-foreground">
          {formatDateTime(referral.createdAt)}
        </span>
      </div>

      <p className="text-xs text-ink-soft">
        {referral.reasonTags.join(", ")}
        {referral.additionalInfo ? `: ${referral.additionalInfo}` : ""}
      </p>
      <p className="text-xs text-muted-foreground">Parent contact: {referral.parentContact}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={isPending}
            onClick={() => handleSetStatus(opt.key)}
            className={cn("rounded-full transition-opacity", opt.key === status ? "" : "opacity-40 hover:opacity-70")}
          >
            <StatusBadge tone={opt.tone}>{opt.label}</StatusBadge>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-error-text">{error}</p>}
    </div>
  );
}
