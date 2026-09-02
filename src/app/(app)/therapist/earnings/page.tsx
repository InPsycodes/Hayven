import { redirect } from "next/navigation";
import type { VariantProps } from "class-variance-authority";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getEarningsSummary, getEarningRows } from "@/lib/payouts/queries";
import { COMMISSION_RATE, MIN_PAYOUT_NAIRA } from "@/lib/payouts/commission";
import { formatDate, formatNaira } from "@/data/format";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Clearing", tone: "amber" },
  available: { label: "Ready", tone: "sage" },
  held: { label: "On hold", tone: "grey" },
  paid: { label: "Paid", tone: "sage" },
  reversed: { label: "Reversed", tone: "error" },
};

export default async function TherapistEarningsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const [summary, rows] = await Promise.all([
    getEarningsSummary(therapist.id),
    getEarningRows(therapist.id),
  ]);

  return (
    <div>
      <DashboardHeader session={session} greeting="Earnings" subtext={`Hayven takes ${COMMISSION_RATE * 100}% per session`} />
      <div className="flex flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Ready to pay out" value={formatNaira(summary.available)} emphasis />
          <StatCard label="Clearing (72h)" value={formatNaira(summary.pending)} />
          <StatCard label="On hold" value={formatNaira(summary.held)} />
          <StatCard label="Paid out" value={formatNaira(summary.paid)} />
        </div>

        <p className="-mt-2 text-xs text-muted-foreground">
          Earnings clear 72 hours after each session, then pay out weekly on Monday once you&apos;re above{" "}
          {formatNaira(MIN_PAYOUT_NAIRA)}. Add your bank details on your Profile so payouts can be sent.
        </p>

        {rows.length === 0 ? (
          <p className="rounded-sm bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            No earnings yet. They show up here after your first completed session.
          </p>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {rows.map((row) => {
                const s = STATUS_LABEL[row.displayStatus] ?? { label: row.displayStatus, tone: "grey" as const };
                return (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal">
                        {row.source === "session"
                          ? `Session with ${row.childFirstName ?? "a client"}`
                          : `Late cancellation — ${row.childFirstName ?? "a client"}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(row.createdAt)} · {formatNaira(row.grossAmount)} charged, less{" "}
                        {formatNaira(row.commissionAmount)} fee
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={
                          row.status === "reversed"
                            ? "text-sm font-medium text-muted-foreground line-through"
                            : "text-sm font-medium text-charcoal"
                        }
                      >
                        {formatNaira(row.netAmount)}
                      </span>
                      <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
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
