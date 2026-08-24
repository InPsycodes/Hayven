"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { reviewSupervisorRequest } from "@/lib/admin/actions";
import { formatDateTime, initialsFromName } from "@/data/format";
import type { RealSupervisorRequest } from "@/lib/admin/queries";

const STATUS_TONE = { pending: "amber", approved: "sage", denied: "error" } as const;

export function SupervisorRequestRow({ request }: { request: RealSupervisorRequest }) {
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();
  const isOpen = request.status === "pending";

  function handleDecision(decision: "approved" | "denied") {
    startTransition(async () => {
      await reviewSupervisorRequest(request.id, decision);
      reset();
    });
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-medium text-charcoal">
            {initialsFromName(request.therapist.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">{request.therapist.fullName}</p>
            <p className="text-xs text-muted-foreground">{request.therapist.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            {formatDateTime(request.requestedAt)}
          </span>
          <StatusBadge tone={STATUS_TONE[request.status as keyof typeof STATUS_TONE] ?? "grey"}>
            {isOpen ? "Pending" : request.status === "approved" ? "Approved" : "Denied"}
          </StatusBadge>
        </div>
      </div>

      {request.note && <p className="rounded-sm bg-card p-2.5 text-sm text-charcoal ring-1 ring-foreground/10">{request.note}</p>}

      {isOpen && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="accent"
            disabled={isPending}
            onClick={guard(() => handleDecision("approved"))}
          >
            {isPending ? "Saving..." : "Approve"}
          </Button>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={guard(() => handleDecision("denied"))}>
            Deny
          </Button>
        </div>
      )}
    </div>
  );
}
