import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getSession } from "@/lib/auth/session";
import { getSafeguardingLeadIds, isSafeguardingLead } from "@/lib/safeguarding/leads";
import { getSafeguardingConcerns } from "@/lib/safeguarding/queries";
import { STATUS_LABELS } from "@/lib/safeguarding/types";
import { formatDate, formatDateTime } from "@/data/format";

export default async function AdminSafeguardingPage() {
  const session = await getSession();
  // notFound, not a redirect: an admin who isn't a lead shouldn't learn
  // anything from this route, including that concerns exist.
  if (!(await isSafeguardingLead(session))) notFound();

  const [concerns, { designated }] = await Promise.all([getSafeguardingConcerns(), getSafeguardingLeadIds()]);

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

      <div className="px-6 pb-8 md:px-8">
        {concerns.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">No concerns logged.</div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {concerns.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/safeguarding/${c.id}`}
                  className="flex flex-col gap-1 px-3 py-3 transition-colors hover:bg-inset"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {c.immediateDanger && c.status !== "closed" && <StatusBadge tone="error">Immediate danger</StatusBadge>}
                    <StatusBadge tone={c.status === "open" ? "amber" : c.status === "closed" ? "grey" : "rust"}>
                      {STATUS_LABELS[c.status]}
                    </StatusBadge>
                    <span className="text-sm font-medium text-charcoal">{c.childFirstName ?? "No specific child"}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.source === "auto_flag" ? "Auto-flagged on report publish" : `Raised by ${c.raisedByName ?? "unknown"}`}{" "}
                      · {formatDateTime(c.createdAt)}
                      {c.reviewDate && ` · review ${formatDate(c.reviewDate)}`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.descriptionPreview}</p>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
