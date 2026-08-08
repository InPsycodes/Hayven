"use client";

import { useState, useTransition } from "react";

import { ReportView } from "@/components/therapy-session/report-view";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { publishReport } from "@/lib/reports/actions";
import type { ReportBody } from "@/lib/reports/types";

export function ParentPreviewPanel({
  reportId,
  body,
  status,
  publishedAt,
}: {
  reportId: string;
  body: ReportBody;
  status: string;
  publishedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [published, setPublished] = useState(publishedAt);
  const [error, setError] = useState<string | null>(null);

  const needsRepublish = published !== null && currentStatus === "in_review";

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishReport(reportId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPublished(new Date().toISOString());
      setCurrentStatus("published");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        This is what the parent will see. No clinical numbers, session mechanics, or antecedent/consequence detail are
        included.
      </p>
      <ReportView body={body} />
      {needsRepublish && (
        <p className="rounded-sm bg-terracotta/10 px-3 py-2 text-xs text-charcoal">
          The clinical report was edited after this was published. The parent is still seeing the version from{" "}
          {published && new Date(published).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
        </p>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex items-center gap-3">
        {published && !needsRepublish ? (
          <StatusBadge tone="sage" className="w-fit">
            Published to parent
          </StatusBadge>
        ) : (
          <Button onClick={handlePublish} disabled={isPending} className="w-fit">
            {isPending ? "Publishing..." : needsRepublish ? "Republish to parent" : "Publish to parent"}
          </Button>
        )}
      </div>
    </div>
  );
}
