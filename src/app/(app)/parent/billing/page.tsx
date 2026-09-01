import { redirect } from "next/navigation";
import type { VariantProps } from "class-variance-authority";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import { getSession } from "@/lib/auth/session";
import { getRealPaymentHistoryForParent } from "@/lib/payments/queries";
import { formatDateTime, formatNaira } from "@/data/format";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  successful: { label: "Paid", tone: "sage" },
  pending: { label: "Pending", tone: "amber" },
  failed: { label: "Failed", tone: "error" },
  refunded: { label: "Refunded", tone: "grey" },
};

export default async function ParentBillingPage() {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/login");

  const payments = await getRealPaymentHistoryForParent(session.userId);
  const totalPaid = payments
    .filter((p) => p.status === "successful")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Billing"
        subtext={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}
      />
      <div className="flex flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total paid" value={formatNaira(totalPaid)} emphasis />
        </div>

        {payments.length === 0 ? (
          <p className="rounded-sm bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            No payments yet.
          </p>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {payments.map((payment) => {
                const status = STATUS_LABEL[payment.status] ?? { label: payment.status, tone: "grey" as const };
                return (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal">
                        {payment.childFirstName} with {payment.counterpartName}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(payment.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium text-charcoal">{formatNaira(payment.amount)}</span>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
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
