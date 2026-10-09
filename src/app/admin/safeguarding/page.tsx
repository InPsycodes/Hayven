import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSession } from "@/lib/auth/session";
import { getSafeguardingLeadIds, isSafeguardingLead } from "@/lib/safeguarding/leads";
import { getSafeguardingConcerns } from "@/lib/safeguarding/queries";
import { STATUS_LABELS, isReviewOverdue, type SafeguardingConcernStatus } from "@/lib/safeguarding/types";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/data/format";

const TABS: SafeguardingConcernStatus[] = ["open", "monitoring", "referred", "closed"];

export default async function AdminSafeguardingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  // notFound, not a redirect: an admin who isn't a lead shouldn't learn
  // anything from this route, including that concerns exist.
  if (!(await isSafeguardingLead(session))) notFound();

  const [concerns, { designated }] = await Promise.all([getSafeguardingConcerns(), getSafeguardingLeadIds()]);
  const { status: rawStatus } = await searchParams;
  const tab: SafeguardingConcernStatus = TABS.includes(rawStatus as SafeguardingConcernStatus)
    ? (rawStatus as SafeguardingConcernStatus)
    : "open";
  const counts = Object.fromEntries(TABS.map((t) => [t, concerns.filter((c) => c.status === t).length])) as Record<
    SafeguardingConcernStatus,
    number
  >;
  // Most urgent first within a tab: immediate danger, then overdue reviews, then newest.
  const urgency = (c: (typeof concerns)[number]) =>
    c.immediateDanger && c.status !== "closed" ? 0 : isReviewOverdue(c.reviewDate, c.status) ? 1 : 2;
  const visible = concerns
    .filter((c) => c.status === tab)
    .sort((a, b) => urgency(a) - urgency(b) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Safeguarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Concerns raised by therapists, and reports flagged automatically when they&apos;re published. Only the
          safeguarding leads can see this page. Record every decision and its reasoning (procedure §5).
        </p>
        {!designated && (
          <p className="mt-3 rounded-sm bg-amber/10 p-3 text-sm text-amber-text">
            No safeguarding leads are designated yet, so every admin can see this page and gets these alerts.
            Designate the DSL and Deputy DSL with the SQL at the top of migration 0104.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 px-6 pb-8 md:px-8">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t}
              href={t === "open" ? "/admin/safeguarding" : `/admin/safeguarding?status=${t}`}
              aria-current={t === tab ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] ring-1 transition-colors",
                t === tab
                  ? "bg-charcoal text-canvas-white ring-charcoal"
                  : "bg-card text-charcoal ring-border hover:ring-charcoal/40"
              )}
            >
              {STATUS_LABELS[t]}
              <span className="ml-1.5 font-mono text-[11px] opacity-70 tabular-nums">{counts[t]}</span>
            </Link>
          ))}
        </nav>
        {visible.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">
            {tab === "open" ? "No open concerns." : `Nothing ${STATUS_LABELS[tab].toLowerCase()}.`}
          </div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {visible.map((c) => {
                const danger = c.immediateDanger && c.status !== "closed";
                const overdue = isReviewOverdue(c.reviewDate, c.status);
                return (
                <Link
                  key={c.id}
                  href={`/admin/safeguarding/${c.id}`}
                  className={cn(
                    "flex flex-col gap-1 border-l-[3px] px-3 py-3 transition-colors hover:bg-inset",
                    danger ? "border-l-error" : overdue ? "border-l-amber" : "border-l-transparent"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {danger && <StatusBadge tone="error">Immediate danger</StatusBadge>}
                    {overdue && <StatusBadge tone="amber">Review overdue</StatusBadge>}
                    <span className="text-sm font-medium text-charcoal">{c.childFirstName ?? "No specific child"}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.source === "auto_flag" ? "Auto-flagged on report publish" : `Raised by ${c.raisedByName ?? "unknown"}`}{" "}
                      · {formatDateTime(c.createdAt)}
                      {c.reviewDate && ` · review ${formatDate(c.reviewDate)}`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.descriptionPreview}</p>
                </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
