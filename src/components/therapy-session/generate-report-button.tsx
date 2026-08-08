"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { generateReport } from "@/lib/reports/actions";

export function GenerateReportButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateReport(sessionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} variant="accent" disabled={isPending} className="w-fit">
        {isPending ? "Generating..." : "Generate report"}
      </Button>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
