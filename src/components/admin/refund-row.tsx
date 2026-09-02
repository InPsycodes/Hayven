"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime, formatNaira } from "@/data/format";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { markPaymentRefunded } from "@/lib/admin/actions";
import type { RealRefundOwed } from "@/lib/admin/queries";

export function RefundRow({ refund }: { refund: RealRefundOwed }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { guard, reset } = useSubmitGuard();

  const act = guard(() => {
    setError(null);
    startTransition(async () => {
      const result = await markPaymentRefunded(refund.paymentId);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      setDone(true);
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
        {done ? (
          <span className="fade-in text-xs text-success-text">Refunded.</span>
        ) : (
          <Button variant="outline" size="sm" disabled={isPending} onClick={act}>
            {isPending ? "..." : "Mark refunded"}
          </Button>
        )}
      </div>
    </div>
  );
}
