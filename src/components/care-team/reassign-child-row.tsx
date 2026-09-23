"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/data/format";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { AdminPickerOption } from "@/lib/admin/queries";

/** E12, external PRD review: one row in the "needs reassignment" queue -- a child left with no active therapist after their previous one was offboarded. */
export function ReassignChildRow({
  childId,
  childName,
  previousTherapistName,
  endedOn,
  therapistOptions,
  onAssign,
}: {
  childId: string;
  childName: string;
  previousTherapistName: string;
  endedOn: string | null;
  therapistOptions: AdminPickerOption[];
  onAssign: (therapistId: string, childId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [therapistId, setTherapistId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState(false);
  const { guard, reset } = useSubmitGuard();

  const handleAssign = guard(() => {
    if (!therapistId) {
      setError("Pick a therapist first.");
      reset();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onAssign(therapistId, childId);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      setAssigned(true);
    });
  });

  if (assigned) {
    return <div className="rounded-sm bg-inset p-3.5 text-sm text-charcoal">{childName} reassigned.</div>;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-inset p-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal">{childName}</p>
        <p className="text-xs text-muted-foreground">
          Was with {previousTherapistName}
          {endedOn ? ` · left ${formatDate(endedOn)}` : ""}
        </p>
        {error && <p className="mt-1 text-xs text-error-text">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Select value={therapistId} onValueChange={setTherapistId}>
          <SelectTrigger className="w-48 bg-card" aria-label="New therapist">
            <SelectValue placeholder="Choose a therapist" />
          </SelectTrigger>
          <SelectContent>
            {therapistOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="accent" disabled={isPending} onClick={handleAssign}>
          {isPending ? "Assigning..." : "Assign"}
        </Button>
      </div>
    </div>
  );
}
