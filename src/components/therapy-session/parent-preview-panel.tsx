"use client";

import { useState, useTransition } from "react";

import { ReportView } from "@/components/therapy-session/report-view";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { publishReport } from "@/lib/reports/actions";
import type { ReportBody } from "@/lib/reports/types";

export function ParentPreviewPanel({
  reportId,
  body,
  status,
  publishedAt,
  flaggedPhrases = [],
  hasActiveSupervisor = false,
}: {
  reportId: string;
  body: ReportBody;
  status: string;
  publishedAt: string | null;
  flaggedPhrases?: string[];
  /** E10/D5: when true, publishing routes through supervisor approval instead of publishing directly -- see publishReport. */
  hasActiveSupervisor?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [published, setPublished] = useState(publishedAt);
  const [error, setError] = useState<string | null>(null);

  const awaitingApproval = hasActiveSupervisor && currentStatus === "in_review";
  const needsRepublish = !hasActiveSupervisor && published !== null && currentStatus === "in_review";
  const { guard, reset } = useSubmitGuard();

  const handlePublish = guard(() => {
    setError(null);
    startTransition(async () => {
      const result = await publishReport(reportId);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      if (result.pendingApproval) {
        setCurrentStatus("in_review");
      } else {
        setPublished(new Date().toISOString());
        setCurrentStatus("published");
      }
      reset(); // a report can legitimately be edited and republished (or resubmitted) later
    });
  });

  const publishLabel = hasActiveSupervisor
    ? published
      ? "Resubmit for review"
      : "Submit for supervisor review"
    : needsRepublish
      ? "Republish to parent"
      : "Publish to parent";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        This is what the parent will see. No clinical numbers, session mechanics, or antecedent/consequence detail are
        included.
      </p>
      {flaggedPhrases.length > 0 && (
        <div className="rounded-sm border border-error/30 bg-error/5 px-3 py-2.5 text-xs text-charcoal">
          <p className="font-medium text-error-text">Your session notes mention something worth a second look:</p>
          <p className="mt-1">
            &quot;{flaggedPhrases.join('", "')}&quot; {flaggedPhrases.length === 1 ? "was" : "were"} found in your
            session notes, which are shown to the parent above. If this is sensitive or internal, consider moving it
            to the confidential note instead before publishing.
          </p>
        </div>
      )}
      <ReportView body={body} />
      {needsRepublish && (
        <p className="rounded-sm bg-terracotta/10 px-3 py-2 text-xs text-charcoal">
          The clinical report was edited after this was published. The parent is still seeing the version from{" "}
          {published && new Date(published).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
        </p>
      )}
      {awaitingApproval && (
        <p className="rounded-sm bg-terracotta/10 px-3 py-2 text-xs text-charcoal">
          {published
            ? "The clinical report was edited and resubmitted -- your supervisor needs to approve the new version before the parent sees it."
            : "Your supervisor needs to approve this before the parent sees it."}
        </p>
      )}
      {error && <p className="text-sm text-error-text">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {awaitingApproval ? (
          <StatusBadge tone="amber" className="fade-in w-fit">
            Awaiting supervisor approval
          </StatusBadge>
        ) : published && !needsRepublish ? (
          <StatusBadge tone="sage" className="fade-in w-fit">
            Published to parent
          </StatusBadge>
        ) : (
          <Button onClick={handlePublish} disabled={isPending} className="w-fit">
            {isPending ? (hasActiveSupervisor ? "Submitting..." : "Publishing...") : publishLabel}
          </Button>
        )}
        <Button asChild variant="outline" className="w-fit">
          <a href={`/api/reports/${reportId}/pdf?version=parent`} download>
            Download parent version (PDF)
          </a>
        </Button>
      </div>
    </div>
  );
}
