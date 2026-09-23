"use client";

import { useTransition } from "react";
import { IconArrowRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, initialsFromName } from "@/data/format";
import { useSubmitGuard } from "@/hooks/use-submit-guard";

function PersonBadge({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-medium text-charcoal">
        {initialsFromName(name)}
      </span>
      <span className="truncate text-sm font-medium text-charcoal">{name}</span>
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  manual: "Ended",
  inactivity: "Expired (90 days inactive)",
};

/** E5, external PRD review: a lapsed (manually ended or inactivity-expired)
 *  therapist-child assignment, with a one-click way to resume it when care
 *  is actually continuing. */
export function LapsedAssignmentRow({
  fromName,
  toName,
  detail,
  startedOn,
  endedOn,
  endedReason,
  assignmentId,
  onRenew,
}: {
  fromName: string;
  toName: string;
  detail?: string | null;
  startedOn: string;
  endedOn: string | null;
  endedReason: string | null;
  assignmentId: string;
  onRenew: (assignmentId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-inset p-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PersonBadge name={fromName} />
        <IconArrowRight size={14} stroke={2} className="shrink-0 text-muted-foreground" />
        <PersonBadge name={toName} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className="text-[11px] text-muted-foreground">
          {detail ? `${detail} · ` : ""}
          {formatDate(startedOn)}
          {endedOn ? ` – ${formatDate(endedOn)}` : ""}
        </p>
        <StatusBadge tone={endedReason === "inactivity" ? "amber" : "rust"}>
          {(endedReason && REASON_LABEL[endedReason]) ?? "Ended"}
        </StatusBadge>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={guard(() =>
            startTransition(async () => {
              const result = await onRenew(assignmentId);
              if (!result.ok) reset(); // allow retry -- row only leaves this list on success
            })
          )}
        >
          {isPending ? "Renewing..." : "Renew"}
        </Button>
      </div>
    </div>
  );
}
