"use client";

import { useState, useTransition } from "react";
import { IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { deleteAvailabilitySlot } from "@/lib/therapist/actions";

/**
 * An open (unbooked) availability slot in the week grid, with a hover/focus
 * "remove" control -- the only place a therapist can take a slot back down.
 */
export function OpenSlotChip({
  slotId,
  label,
  sessionType,
}: {
  slotId: string;
  label: string;
  sessionType: string;
}) {
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  if (removed) return null;

  const remove = guard(() => {
    setError(null);
    startTransition(async () => {
      const result = await deleteAvailabilitySlot(slotId);
      if (result.ok) setRemoved(true);
      else {
        setError(result.error);
        reset();
      }
    });
  });

  return (
    <div
      className={cn(
        "group/slot flex h-full flex-col justify-center rounded-sm bg-card px-2 py-1 text-[11px] leading-tight text-charcoal ring-1 ring-inset ring-border",
        isPending && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium">{label}</span>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          aria-label={`Remove the ${label} open slot`}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:text-error-text focus-visible:opacity-100 group-hover/slot:opacity-100 pointer-fine:opacity-0"
        >
          <IconX size={11} stroke={2.5} />
        </button>
      </div>
      {error ? (
        <span className="text-error-text">{error}</span>
      ) : (
        <span className="capitalize opacity-60">{sessionType.replace("_", " ")}</span>
      )}
    </div>
  );
}
