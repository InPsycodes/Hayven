import Link from "next/link";
import { redirect } from "next/navigation";
import { IconAlertTriangle, IconArrowRight } from "@tabler/icons-react";

import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { isSafeguardingLead } from "@/lib/safeguarding/leads";
import { getAdminOverview, type AdminQueue } from "@/lib/admin/overview";
import { formatDate, formatNaira, formatRelativeToNow, greetingForNow, shortName } from "@/data/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Today" };

/**
 * The admin home: one tile per work queue (same counts as the sidebar
 * badges) with the oldest item's age, an urgent banner for anything
 * time-critical, and this week's money and platform figures.
 */
export default async function AdminOverviewPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const lead = await isSafeguardingLead(session);
  const overview = await getAdminOverview(lead);
  const { money, platform, urgentSafeguarding } = overview;
  const waiting = overview.queues.filter((q) => q.count > 0);
  const clear = overview.queues.filter((q) => q.count === 0);

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="flex max-w-5xl flex-col gap-6 p-6 md:p-8">
        <div>
          <h1 className="font-heading text-2xl text-charcoal">
            {greetingForNow()}, {shortName(session.name)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {waiting.length === 0
              ? "Nothing is waiting on you right now."
              : `${waiting.length} ${waiting.length === 1 ? "queue needs" : "queues need"} attention.`}
          </p>
        </div>

        {urgentSafeguarding && urgentSafeguarding.count > 0 && (
          <Link
            href="/admin/safeguarding"
            className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-error/10 px-4 py-3 text-sm text-error-text ring-1 ring-error/30 transition-colors hover:bg-error/15"
          >
            <span className="flex items-center gap-2">
              <IconAlertTriangle size={18} stroke={1.75} aria-hidden className="shrink-0" />
              <span>
                <span className="font-semibold">
                  {urgentSafeguarding.count} safeguarding {urgentSafeguarding.count === 1 ? "concern" : "concerns"}
                </span>{" "}
                marked as immediate danger
                {urgentSafeguarding.oldestAt && `, oldest raised ${formatRelativeToNow(urgentSafeguarding.oldestAt)}`}.
              </span>
            </span>
            <span className="flex items-center gap-1 font-semibold">
              Open <IconArrowRight size={15} stroke={2} aria-hidden />
            </span>
          </Link>
        )}

        {money.payoutToday && money.clearedNaira > 0 && (
          <Link
            href="/admin/payouts"
            className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-amber/10 px-4 py-3 text-sm text-amber-text ring-1 ring-amber/30 transition-colors hover:bg-amber/15"
          >
            <span>
              <span className="font-semibold">Payout run is due today.</span> {formatNaira(money.clearedNaira)} has
              cleared for therapists.
            </span>
            <span className="flex items-center gap-1 font-semibold">
              Run payouts <IconArrowRight size={15} stroke={2} aria-hidden />
            </span>
          </Link>
        )}

        <section aria-labelledby="queues-h" className="flex flex-col gap-3">
          <h2 id="queues-h" className="label-micro text-muted-foreground">
            Waiting on you
          </h2>
          {waiting.length === 0 ? (
            <div className="rounded-sm bg-card p-5 text-sm text-muted-foreground ring-1 ring-border">
              Every queue is clear.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {waiting.map((q) => (
                <QueueTile key={q.href + q.label} queue={q} />
              ))}
            </div>
          )}
          {clear.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Clear:{" "}
              {clear.map((q, i) => (
                <span key={q.label}>
                  {i > 0 && " · "}
                  <Link href={q.href} className="hover:text-charcoal hover:underline">
                    {q.label}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <Card className="flex flex-col gap-2 p-5">
            <h2 className="label-micro text-muted-foreground">Money</h2>
            <Figure label="Next payout run" value={money.payoutToday ? "Today" : formatDate(money.nextPayoutDate)} />
            <Figure label="Cleared for payout" value={formatNaira(money.clearedNaira)} />
            <Figure label="Held by open disputes" value={formatNaira(money.heldNaira)} />
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <h2 className="label-micro text-muted-foreground">Platform</h2>
            <Figure label="Therapists live in search" value={String(platform.liveTherapists)} />
            <Figure
              label="Insurance ending in 30 days"
              value={String(platform.insuranceEndingSoon)}
              warn={platform.insuranceEndingSoon > 0}
            />
            <Figure label="Confirmed sessions, next 7 days" value={String(platform.sessionsNext7Days)} />
            <Figure label="Families waiting for therapists" value={String(platform.waitlist)} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function QueueTile({ queue }: { queue: AdminQueue }) {
  return (
    <Link
      href={queue.href}
      className="group flex flex-col gap-1 rounded-sm bg-card p-4 ring-1 ring-border transition-colors hover:ring-charcoal/30"
    >
      <span className="font-heading text-3xl leading-none text-charcoal tabular-nums">{queue.count}</span>
      <span className="text-sm font-medium text-charcoal group-hover:text-rust-dark">{queue.label}</span>
      <span className="text-xs text-muted-foreground">
        {queue.oldestAt ? `Oldest ${formatRelativeToNow(queue.oldestAt)}` : "Open the queue"}
      </span>
    </Link>
  );
}

function Figure({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2 text-sm last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", warn ? "font-semibold text-amber-text" : "text-charcoal")}>{value}</span>
    </div>
  );
}
