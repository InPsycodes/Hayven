"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import type { VariantProps } from "class-variance-authority";
import { formatDateTime, initialsFromName } from "@/data/format";
import { reviewAccountDeletionRequest, type AccountDeletionDecision } from "@/lib/admin/actions";
import type { RealAccountDeletionRequest } from "@/lib/admin/queries";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "amber" },
  reviewed: { label: "Reviewed", tone: "rust" },
  actioned: { label: "Actioned", tone: "sage" },
};

export function DeletionRequestRow({ request }: { request: RealAccountDeletionRequest }) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<AccountDeletionDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = STATUS_LABEL[request.status] ?? STATUS_LABEL.pending;

  function act(action: AccountDeletionDecision) {
    setPendingAction(action);
    setError(null);
    startTransition(async () => {
      const result = await reviewAccountDeletionRequest(request.id, action);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-medium text-charcoal">
          {initialsFromName(request.requester.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-charcoal">
            {request.requester.fullName} <span className="text-xs text-muted-foreground">({request.requester.role})</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {request.requester.email}
            {request.reason ? ` · "${request.reason}"` : ""}
          </p>
          {error && <p className="mt-1 text-xs text-error">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[11px] whitespace-nowrap text-muted-foreground">
          {formatDateTime(request.requestedAt)}
        </span>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {request.status !== "actioned" && (
          <div className="flex gap-2">
            {request.status === "pending" && (
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => act("reviewed")}>
                {isPending && pendingAction === "reviewed" ? "..." : "Mark reviewed"}
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={isPending} onClick={() => act("actioned")}>
              {isPending && pendingAction === "actioned" ? "..." : "Mark actioned"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
