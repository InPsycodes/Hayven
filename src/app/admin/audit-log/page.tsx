import { getAuditLogEntries } from "@/lib/admin/queries";
import { formatDateTime, initialsFromName } from "@/data/format";
import { Card } from "@/components/ui/card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import type { VariantProps } from "class-variance-authority";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const ACTION_LABEL: Record<string, string> = {
  "session_note.create": "Logged a session note",
  "goal.create": "Added a goal",
  "report.generate": "Generated a report",
  "report.save": "Edited a report",
  "report.publish": "Published a report to parent",
  "verification.decide": "Reviewed a verification request",
  "assignment.therapist_child.create": "Assigned therapist to child",
  "assignment.therapist_child.end": "Ended a therapist-child assignment",
  "assignment.supervisor_therapist.create": "Assigned supervisor to therapist",
  "assignment.supervisor_therapist.end": "Ended a supervisor assignment",
};

const ACTION_TONE: Record<string, Tone> = {
  create: "sage",
  publish: "sage",
  save: "rust",
  generate: "rust",
  decide: "rust",
  end: "error",
};

function toneFor(action: string): Tone {
  const key = action.split(".").pop() ?? "";
  return ACTION_TONE[key] ?? "grey";
}

export default async function AdminAuditLogPage() {
  const entries = await getAuditLogEntries();

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F6F4F0]">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A record of sensitive actions across the platform: who did what, and when.
        </p>
      </div>

      <div className="px-6 pb-8 md:px-8">
        {entries.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">No activity recorded yet.</div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {entries.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-medium text-charcoal">
                      {initialsFromName(entry.actorName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-charcoal">
                        <span className="font-medium">{entry.actorName}</span>{" "}
                        <span className="text-xs text-muted-foreground">({entry.actorRole})</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.entityType}
                        {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge tone={toneFor(entry.action)}>{ACTION_LABEL[entry.action] ?? entry.action}</StatusBadge>
                    <span className="text-[11px] whitespace-nowrap text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
