"use client";

import { useTransition } from "react";

import { cn } from "@/lib/utils";

export function ActiveToggle({
  id,
  isActive,
  onToggle,
}: {
  id: string;
  isActive: boolean;
  onToggle: (id: string, isActive: boolean) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await onToggle(id, !isActive);
        })
      }
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        isActive ? "bg-success/10 text-success" : "bg-paper text-muted-foreground"
      )}
    >
      {isPending ? "..." : isActive ? "Active" : "Inactive"}
    </button>
  );
}
