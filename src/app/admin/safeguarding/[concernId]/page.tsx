import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SafeguardingConcernForm } from "@/components/admin/safeguarding-concern-form";
import { getSession } from "@/lib/auth/session";
import { isSafeguardingLead } from "@/lib/safeguarding/leads";
import { getSafeguardingConcern } from "@/lib/safeguarding/queries";
import { STATUS_LABELS } from "@/lib/safeguarding/types";
import { formatDateTime } from "@/data/format";

export default async function AdminSafeguardingConcernPage({ params }: { params: Promise<{ concernId: string }> }) {
  const session = await getSession();
  if (!(await isSafeguardingLead(session))) notFound();

  const { concernId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(concernId)) notFound();
  const concern = await getSafeguardingConcern(concernId);
  if (!concern) notFound();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="flex max-w-3xl flex-col gap-5 p-6 md:p-8">
        <Link href="/admin/safeguarding" className="text-sm text-muted-foreground hover:text-charcoal">
          ← All concerns
        </Link>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl text-charcoal">{concern.childFirstName ?? "No specific child"}</h1>
            {concern.immediateDanger && <StatusBadge tone="error">Immediate danger</StatusBadge>}
            <StatusBadge tone={concern.status === "open" ? "amber" : concern.status === "closed" ? "grey" : "rust"}>
              {STATUS_LABELS[concern.status]}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {concern.source === "auto_flag"
              ? "Auto-flagged when a report was published"
              : `Raised by ${concern.raisedByName ?? "unknown"}`}{" "}
            · {formatDateTime(concern.createdAt)}
            {concern.childId && (
              <>
                {" · "}
                <Link href={`/admin/users`} className="underline">
                  manage this child&apos;s care team
                </Link>
              </>
            )}
          </p>
        </div>

        <Card className="p-5">
          <p className="label-micro text-rust-dark">What was raised</p>
          <p className="mt-2 text-sm whitespace-pre-wrap text-charcoal">{concern.description}</p>
          {concern.matchedPhrases.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">Matched wording: {concern.matchedPhrases.join(", ")}</p>
          )}
        </Card>

        <Card className="p-5">
          <p className="label-micro text-rust-dark">Decision and record</p>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            If the concern is about a therapist: end their assignment to this child under Assignments, and suspend or
            offboard their account under Accounts (procedure §5.3). Then record what you did here.
          </p>
          <SafeguardingConcernForm concern={concern} />
        </Card>

        <div>
          <p className="label-micro mb-2 text-rust-dark">History</p>
          <Card className="p-2">
            <ol className="flex flex-col divide-y divide-border">
              {concern.events.map((e) => (
                <li key={e.id} className="px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(e.createdAt)} · {e.actorName ?? "System"} · {e.kind.replace("_", " ")}
                  </p>
                  {e.note && <p className="mt-0.5 text-sm text-charcoal">{e.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
