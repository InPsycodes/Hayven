"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatNaira } from "@/data/format";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { resolveDispute } from "@/lib/disputes/actions";
import type { AdminDispute, DisputeResolution } from "@/lib/disputes/queries";

const OPTIONS: { value: DisputeResolution; label: string }[] = [
  { value: "full_refund", label: "Full refund" },
  { value: "partial_refund", label: "Partial refund" },
  { value: "no_action", label: "No change" },
];

export function DisputeRow({ dispute }: { dispute: AdminDispute }) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<DisputeResolution>("full_refund");
  const [amount, setAmount] = useState(String(dispute.amountPaid ?? ""));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const isRefund = resolution === "full_refund" || resolution === "partial_refund";

  const submit = guard(() => {
    setError(null);
    start(async () => {
      const res = await resolveDispute(
        dispute.id,
        resolution,
        note,
        isRefund ? Number(amount) : undefined
      );
      if (!res.ok) {
        setError(res.error);
        reset();
        return;
      }
      setDone(true);
    });
  });

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-charcoal">
            {dispute.parentName} <span className="text-xs text-muted-foreground">({dispute.parentEmail})</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {dispute.childFirstName} with {dispute.therapistName} ·{" "}
            {dispute.sessionDate ? formatDateTime(dispute.sessionDate) : "date unknown"} · {dispute.bookingStatus}
            {dispute.amountPaid ? ` · ${formatNaira(dispute.amountPaid)} paid` : ""}
          </p>
          <p className="mt-1.5 text-sm text-charcoal">&ldquo;{dispute.reason}&rdquo;</p>
        </div>
        <div className="shrink-0">
          {done ? (
            <span className="fade-in text-xs text-success-text">Resolved.</span>
          ) : !open ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Resolve
            </Button>
          ) : null}
        </div>
      </div>

      {open && !done && (
        <div className="flex flex-col gap-2 rounded-sm bg-[#F6F4F0] p-3">
          <div className="flex flex-wrap gap-3">
            {OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-1.5 text-xs text-charcoal">
                <input
                  type="radio"
                  name={`res-${dispute.id}`}
                  checked={resolution === o.value}
                  onChange={() => setResolution(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
          {isRefund && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Refund ₦</span>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Refund amount in naira"
                className="h-8 w-32 text-xs"
              />
              <span className="text-[11px] text-muted-foreground">
                queued to the refund list; move the money in Paystack
              </span>
            </div>
          )}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Note to the parent, explaining the outcome"
            aria-label="Resolution note"
            className="text-xs"
          />
          {error && <p className="text-xs text-error-text">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending ? "Saving..." : "Confirm resolution"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
