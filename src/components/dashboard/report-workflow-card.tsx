import type { ReportWorkflowSummary } from "@/lib/reports/queries";

const ROWS: { key: keyof ReportWorkflowSummary; label: string; dotClassName: string }[] = [
  { key: "needsReportCount", label: "Need reports", dotClassName: "bg-terracotta" },
  { key: "draftCount", label: "Draft", dotClassName: "bg-amber" },
  { key: "publishedCount", label: "Published", dotClassName: "bg-success" },
];

export function ReportWorkflowCard({ summary }: { summary: ReportWorkflowSummary }) {
  return (
    <div className="rounded-sm bg-card p-[18px] ring-1 ring-border">
      <span className="label-micro text-muted-foreground">Report status</span>
      <div className="mt-2 flex flex-col gap-1">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs text-charcoal">
              <span className={`size-1.5 rounded-full ${row.dotClassName}`} />
              {row.label}
            </span>
            <span className="text-sm font-medium text-charcoal">{summary[row.key] as number}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
