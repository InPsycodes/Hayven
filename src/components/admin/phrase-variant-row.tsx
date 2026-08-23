"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/data/format";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealReportPhraseVariant } from "@/lib/admin/queries";

export function PhraseVariantRow({
  variant,
  domainLabel,
  bandLabel,
  onDelete,
}: {
  variant: RealReportPhraseVariant;
  domainLabel: string;
  bandLabel: string | null;
  onDelete: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-sm bg-[#F6F4F0] p-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-charcoal">
            {domainLabel}
            {bandLabel ? ` · ${bandLabel}` : ""}
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium capitalize text-charcoal">
            {variant.tone}
          </span>
        </div>
        <p className="text-sm text-charcoal">{variant.phrase}</p>
        <p className="text-[11px] text-muted-foreground">Added {formatDate(variant.createdAt)}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={guard(() =>
          startTransition(async () => {
            const result = await onDelete(variant.id);
            if (!result.ok) reset(); // row is only removed from the list on success
          })
        )}
      >
        {isPending ? "Deleting..." : "Delete"}
      </Button>
    </div>
  );
}
