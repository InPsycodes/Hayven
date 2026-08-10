"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CancelResult = { ok: true; wasPaid: boolean } | { ok: false; error: string };

export function CancelBookingButton({
  bookingId,
  wasPaid,
  cancelAction,
}: {
  bookingId: string;
  wasPaid: boolean;
  cancelAction: (bookingId: string, reason?: string) => Promise<CancelResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  function handleCancel(formData: FormData) {
    const reason = formData.get("reason");
    setError(null);
    startTransition(async () => {
      const result = await cancelAction(bookingId, typeof reason === "string" ? reason : undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCancelled(true);
    });
  }

  if (cancelled) {
    return <span className="fade-in shrink-0 text-xs text-muted-foreground">Cancelled.</span>;
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setExpanded(true)}
        className="shrink-0 border-error text-error hover:bg-error/5"
      >
        Cancel session
      </Button>
    );
  }

  return (
    <form action={handleCancel} className="flex w-full flex-col gap-2 sm:w-64">
      <p className="text-xs text-muted-foreground">
        {wasPaid
          ? "This won't automatically refund you. Our team will follow up separately."
          : "This will release the slot."}
      </p>
      <Textarea name="reason" rows={2} placeholder="Reason (optional)" className="text-xs" />
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={isPending}
          className="border-error text-error hover:bg-error/5"
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
