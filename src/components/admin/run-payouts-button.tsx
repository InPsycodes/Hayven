"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/data/format";
import { runPayouts, type PayoutRunResult } from "@/lib/payouts/actions";

export function RunPayoutsButton({ eligibleCount }: { eligibleCount: number }) {
  const router = useRouter();
  const [result, setResult] = useState<PayoutRunResult | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setResult(null);
    start(async () => {
      const r = await runPayouts();
      setResult(r);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={run} disabled={pending || eligibleCount === 0} className="w-fit">
        {pending
          ? "Running..."
          : eligibleCount === 0
            ? "Nothing to pay out"
            : `Run payout for ${eligibleCount} therapist${eligibleCount === 1 ? "" : "s"}`}
      </Button>

      {result && (
        <div className="rounded-sm bg-white p-3 text-xs ring-1 ring-border">
          {!result.ok ? (
            <p className="text-error-text">{result.error}</p>
          ) : (
            <>
              <p className="text-charcoal">
                {result.created} payout{result.created === 1 ? "" : "s"} sent · {formatNaira(result.paidNaira)}
              </p>
              {result.skipped.map((s) => (
                <p key={s.name} className="mt-0.5 text-muted-foreground">
                  Skipped {s.name}: {s.reason}
                </p>
              ))}
              {result.errors.map((e, i) => (
                <p key={i} className="mt-0.5 text-error-text">
                  {e}
                </p>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
