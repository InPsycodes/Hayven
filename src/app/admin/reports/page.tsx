import { getAllReportsForAdmin } from "@/lib/admin/queries";
import { formatDateTime, initialsFromName } from "@/data/format";
import { Card } from "@/components/ui/card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import type { VariantProps } from "class-variance-authority";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "grey" },
  in_review: { label: "Needs re-publish", tone: "amber" },
  published: { label: "Published", tone: "sage" },
};

export default async function AdminReportsPage() {
  const reports = await getAllReportsForAdmin();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every clinical progress report generated across the platform.
        </p>
      </div>

      <div className="px-6 pb-8 md:px-8">
        {reports.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">No reports generated yet.</div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {reports.map((r) => {
                const status = STATUS_LABEL[r.status] ?? { label: r.status, tone: "grey" as const };
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-medium text-charcoal">
                        {initialsFromName(r.childName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-charcoal">{r.childName}</p>
                        <p className="text-xs text-muted-foreground">{r.therapistName}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      <span className="text-[11px] whitespace-nowrap text-muted-foreground">
                        {r.publishedAt
                          ? `Published ${formatDateTime(r.publishedAt)}`
                          : r.generatedAt
                            ? `Generated ${formatDateTime(r.generatedAt)}`
                            : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
