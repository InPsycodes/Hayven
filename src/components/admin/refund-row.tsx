"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime, formatNaira } from "@/data/format";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { markPaymentRefunded, processRefund } from "@/lib/admin/actions";
import type { RealRefundOwed } from "@/lib/admin/queries";

export function RefundRow({ refund }: { refund: RealRefundOwed }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"processing" | "manual" | null>(
    refund.refundStatus === "processing" ? "processing" : null
  );
  const { guard, reset } = useSubmitGuard();

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, outcome: "processing" | "manual") =>
    guard(() => {
      setError(null);
      startTransition(async () => {
        const result = await fn();
        if (!result.ok) {
          setError(result.error);
          reset();
          return;
        }
        setDone(outcome);
      });
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal">
          {refund.parentName} <span className="text-xs text-muted-foreground">({refund.parentEmail})</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {refund.childFirstName} with {refund.therapistName}
          {refund.cancelledAt ? ` · cancelled ${formatDateTime(refund.cancelledAt)}` : ""}
          {refund.cancellationReason ? ` · "${refund.cancellationReason}"` : ""}
        </p>
        {error && <p className="mt-1 text-xs text-error-text">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-right text-sm font-medium text-charcoal">
          {formatNaira(refund.refundAmount)}
          {refund.refundAmount !== refund.amount && (
            <span className="block text-[11px] font-normal text-muted-foreground">
              of {formatNaira(refund.amount)} paid
            </span>
          )}
        </span>
        {done === "processing" ? (
          <span className="fade-in text-xs text-muted-foreground">Refund processing…</span>
        ) : done === "manual" ? (
          <span className="fade-in text-xs text-success-text">Marked done.</span>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={run(() => processRefund(refund.paymentId), "processing")}
            >
              {isPending ? "..." : "Process refund"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={run(() => markPaymentRefunded(refund.paymentId), "manual")}
            >
              Mark done manually
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
