"use client";

import { useState, useTransition } from "react";
import { IconFileText, IconCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { formatDate, initialsFromName } from "@/data/format";
import { reviewVerificationRequestReal, type VerificationDecision } from "@/lib/admin/actions";
import type { RealVerificationRequest } from "@/lib/admin/queries";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  submitted: { label: "Pending review", tone: "amber" },
  in_review: { label: "In review", tone: "amber" },
  approved: { label: "Approved", tone: "sage" },
  rejected: { label: "Rejected", tone: "error" },
  needs_more_info: { label: "Flagged: needs more info", tone: "amber" },
};

export function VerificationDetailPanel({ request }: { request: RealVerificationRequest }) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = STATUS_LABEL[request.status] ?? STATUS_LABEL.submitted;
  const isResolved = request.status === "approved" || request.status === "rejected";

  function act(action: VerificationDecision) {
    setPendingAction(action);
    setError(null);
    startTransition(async () => {
      const result = await reviewVerificationRequestReal(request.id, action);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-offwhite">
      <div className="flex items-start justify-between p-6 md:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-paper text-lg font-medium text-charcoal">
            {initialsFromName(request.therapist.displayName)}
          </span>
          <div>
            <h2 className="font-heading text-[27px] text-charcoal">{request.therapist.displayName}</h2>
            <p className="text-[21px] text-muted-foreground">
              {request.therapist.specialties.join(", ") || "No specialty on file"}
            </p>
          </div>
        </div>
        <StatusBadge tone={status.tone} className="shrink-0 px-4 py-1.5 text-lg">
          {status.label}
        </StatusBadge>
      </div>

      <div className="grid gap-6 px-6 pb-6 md:grid-cols-2 md:px-8">
        <Card lift className="p-5">
          <h3 className="text-[15px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Application details
          </h3>
          <div className="mt-3 flex flex-col gap-2.5 text-[21px]">
            <DetailRow label="Full name" value={request.therapist.displayName} />
            <DetailRow label="Email" value={request.therapist.email} />
            <DetailRow label="Specialty" value={request.therapist.specialties.join(", ") || "Not provided"} />
            <DetailRow label="Professional body" value={request.therapist.professionalBody ?? "Not provided"} />
            <DetailRow label="Membership number" value={request.therapist.membershipNumber ?? "Not provided"} />
            <DetailRow
              label="Years practicing"
              value={request.therapist.yearsPracticing != null ? String(request.therapist.yearsPracticing) : "Not provided"}
            />
          </div>
        </Card>

        <Card lift className="p-5">
          <h3 className="text-[15px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Submitted documents
          </h3>
          <div className="mt-3 flex flex-col gap-2">
            {request.credentials.length === 0 && (
              <p className="text-[21px] text-muted-foreground">No documents uploaded.</p>
            )}
            {request.credentials.map((cred) => (
              <div key={cred.id} className="flex items-center gap-3 rounded-sm bg-offwhite/60 p-3">
                <IconFileText size={24} stroke={1.5} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[21px] text-charcoal">{cred.fileName}</p>
                  <p className="text-base text-muted-foreground">
                    {cred.issuingBody} · {formatDate(cred.uploadedAt)}
                  </p>
                </div>
                {cred.signedUrl ? (
                  <a
                    href={cred.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-lg font-medium text-terracotta hover:underline"
                  >
                    View full document
                  </a>
                ) : (
                  <span className="shrink-0 text-lg text-muted-foreground">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="px-6 pb-6 md:px-8">
        <Card lift className="p-5">
          <h3 className="text-[15px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Verification checklist
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            <ChecklistRow checked label="Certificate matches claimed credential" />
            <ChecklistRow checked label="Membership number confirmed with the professional body" />
            <ChecklistRow checked={false} label='Membership status confirmed "in good standing"' />
          </div>
        </Card>
      </div>

      {error && <p className="px-6 text-[21px] text-error md:px-8">{error}</p>}

      <div className="mt-auto flex flex-wrap gap-3 border-t border-charcoal/10 px-6 py-5 md:px-8">
        <Button
          size="lg"
          onClick={() => act("approved")}
          disabled={isPending || isResolved}
          className="flex-1 min-w-40 text-base"
        >
          {isPending && pendingAction === "approved"
            ? "Approving..."
            : "Approve & issue verified badge"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => act("needs_more_info")}
          disabled={isPending || isResolved}
          className="flex-1 min-w-36 text-base"
        >
          Request more info
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => act("rejected")}
          disabled={isPending || isResolved}
          className="flex-1 min-w-28 border-error text-error hover:bg-error/5 text-base"
        >
          Reject
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-charcoal">{value}</span>
    </div>
  );
}

function ChecklistRow({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-[3px]",
          checked ? "bg-terracotta text-white" : "border border-border"
        )}
      >
        {checked && <IconCheck size={17} stroke={3} />}
      </span>
      <span className="text-[21px] text-charcoal">{label}</span>
    </div>
  );
}
