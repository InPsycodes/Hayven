"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { computeRefund, type CancelInitiator, type RefundOutcome } from "@/lib/booking/refund-policy";
import { formatNaira } from "@/data/format";

type CancelResult =
  | { ok: true; wasPaid: boolean; refundNaira: number }
  | { ok: false; error: string };

export function CancelBookingButton({
  bookingId,
  wasPaid,
  cancelAction,
  paidAmount,
  slotStartTime,
  initiatedBy = "parent",
}: {
  bookingId: string;
  wasPaid: boolean;
  cancelAction: (bookingId: string, reason?: string) => Promise<CancelResult>;
  /** Naira the parent paid -- lets the dialog show a refund estimate. */
  paidAmount?: number | null;
  slotStartTime?: string;
  initiatedBy?: CancelInitiator;
}) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [estimate, setEstimate] = useState<RefundOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ refundNaira: number } | null>(null);
  const { guard, reset } = useSubmitGuard();

  function open() {
    setEstimate(
      wasPaid && paidAmount && slotStartTime
        ? computeRefund({
            amountPaidNaira: paidAmount,
            slotStartMs: new Date(slotStartTime).getTime(),
            nowMs: Date.now(),
            initiatedBy,
          })
        : null
    );
    setExpanded(true);
  }

  const handleCancel = guard((formData: FormData) => {
    const reason = formData.get("reason");
    setError(null);
    startTransition(async () => {
      const result = await cancelAction(bookingId, typeof reason === "string" ? reason : undefined);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      setDone({ refundNaira: result.refundNaira });
    });
  });

  if (done) {
    return (
      <span className="fade-in shrink-0 text-xs text-muted-foreground">
        {done.refundNaira > 0 ? `Cancelled. ${formatNaira(done.refundNaira)} refund on the way.` : "Cancelled."}
      </span>
    );
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={open}
        className="shrink-0 border-error text-error-text hover:bg-error/5"
      >
        Cancel session
      </Button>
    );
  }

  const explainer = !wasPaid
    ? "This will release the slot."
    : estimate
      ? estimate.refundNaira > 0
        ? `You'll be refunded about ${formatNaira(estimate.refundNaira)}${
            estimate.tier === "partial" ? " (50%, since it's within 24 hours of the start)" : ""
          }${
            estimate.feeNaira > 0 ? `. The payment processing fee (${formatNaira(estimate.feeNaira)}) is non-refundable` : ""
          }. It's processed within 5-10 business days.`
        : "No refund applies for a cancellation this close to the session."
      : "A refund, if any, follows the cancellation policy and is processed by our team.";

  return (
    <form action={handleCancel} className="flex w-full flex-col gap-2 sm:w-64">
      <p className="text-xs text-muted-foreground">{explainer}</p>
      <Textarea name="reason" rows={2} placeholder="Reason (optional)" aria-label="Cancellation reason" className="text-xs" />
      {error && <p className="text-xs text-error-text">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={isPending}
          className="border-error text-error-text hover:bg-error/5"
        >
          {isPending ? "Cancelling..." : "Confirm cancellation"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
