"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateReport } from "@/lib/reports/actions";

export function GenerateReportButton({
  sessionId,
  defaultTone,
}: {
  sessionId: string;
  defaultTone: "warm" | "direct";
}) {
  const router = useRouter();
  const [tone, setTone] = useState<"warm" | "direct">(defaultTone);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateReport(sessionId, tone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="label-micro text-muted-foreground">Report tone</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as "warm" | "direct")}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleClick} variant="accent" disabled={isPending} className="w-fit">
          {isPending ? "Generating..." : "Generate report"}
        </Button>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
