import type { VariantProps } from "class-variance-authority";

import { Card } from "@/components/ui/card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import { RunPayoutsButton } from "@/components/admin/run-payouts-button";
import { getPayoutPreview, getPayoutHistory } from "@/lib/payouts/queries";
import { MIN_PAYOUT_NAIRA } from "@/lib/payouts/commission";
import { formatDate, formatNaira } from "@/data/format";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "amber" },
  processing: { label: "Processing", tone: "amber" },
  paid: { label: "Paid", tone: "sage" },
  failed: { label: "Failed", tone: "error" },
};

export default async function AdminPayoutsPage() {
  const [preview, history] = await Promise.all([getPayoutPreview(), getPayoutHistory()]);
  const eligible = preview.filter((p) => p.eligible);

  return (
    <div className="min-h-screen overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Payouts</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Therapist earnings clear 72h after a session. A run pays everyone at or above{" "}
          {formatNaira(MIN_PAYOUT_NAIRA)} via Paystack Transfer; the rest rolls to next time. Disputed
          sessions are held out automatically.
        </p>
        <div className="mt-4">
          <RunPayoutsButton eligibleCount={eligible.length} />
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 md:px-8">
        <section>
          <h2 className="mb-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">Ready now</h2>
          {preview.length === 0 ? (
            <div className="rounded-sm bg-white p-4 text-sm text-muted-foreground">No cleared earnings.</div>
          ) : (
            <Card lift className="p-2">
              <div className="flex flex-col divide-y divide-border">
                {preview.map((p) => (
                  <div key={p.therapistId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="text-charcoal">
                      {p.name} <span className="text-xs text-muted-foreground">· {p.earningCount} item{p.earningCount === 1 ? "" : "s"}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-charcoal">{formatNaira(p.clearedNaira)}</span>
                      {!p.hasBank ? (
                        <StatusBadge tone="error">No bank</StatusBadge>
                      ) : !p.eligible ? (
                        <StatusBadge tone="grey">Below min</StatusBadge>
                      ) : (
                        <StatusBadge tone="sage">Will pay</StatusBadge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">History</h2>
          {history.length === 0 ? (
            <div className="rounded-sm bg-white p-4 text-sm text-muted-foreground">No payouts yet.</div>
          ) : (
            <Card lift className="p-2">
              <div className="flex flex-col divide-y divide-border">
                {history.map((h) => {
                  const s = STATUS[h.status] ?? { label: h.status, tone: "grey" as const };
                  return (
                    <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="text-charcoal">{h.therapistName}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          · {formatDate(h.createdAt)}
                          {h.failureReason ? ` · ${h.failureReason}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-charcoal">{formatNaira(h.amount)}</span>
                        <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
