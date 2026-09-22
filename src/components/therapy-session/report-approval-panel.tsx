"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { approveAndPublishReport } from "@/lib/supervisor/actions";

/** E10/D5, external PRD review: the supervisor-side half of the approval gate -- shown on a report that's in_review, awaiting this supervisor's sign-off before the parent can see it. */
export function ReportApprovalPanel({ reportId }: { reportId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const { guard, reset } = useSubmitGuard();

  const handleApprove = guard(() => {
    setError(null);
    startTransition(async () => {
      const result = await approveAndPublishReport(reportId);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      setApproved(true);
    });
  });

  if (approved) {
    return (
      <StatusBadge tone="sage" className="fade-in w-fit">
        Approved and published to parent
      </StatusBadge>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-error-text">{error}</p>}
      <Button onClick={handleApprove} disabled={isPending} className="w-fit">
        {isPending ? "Approving..." : "Approve & publish to parent"}
      </Button>
    </div>
  );
}
