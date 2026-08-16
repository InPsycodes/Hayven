"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminPickerOption } from "@/lib/admin/queries";

export function AssignPicker({
  leftLabel,
  leftOptions,
  rightLabel,
  rightOptions,
  submitLabel,
  onSubmit,
}: {
  leftLabel: string;
  leftOptions: AdminPickerOption[];
  rightLabel: string;
  rightOptions: AdminPickerOption[];
  submitLabel: string;
  onSubmit: (leftId: string, rightId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    if (!leftId || !rightId) {
      setError("Choose both to continue.");
      return;
    }
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await onSubmit(leftId, rightId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLeftId("");
      setRightId("");
      setSuccess(true);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
      <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label className="label-micro text-muted-foreground">{leftLabel}</Label>
          <Select value={leftId} onValueChange={setLeftId}>
            <SelectTrigger className="w-full bg-white" aria-label={leftLabel}>
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {leftOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="label-micro text-muted-foreground">{rightLabel}</Label>
          <Select value={rightId} onValueChange={setRightId}>
            <SelectTrigger className="w-full bg-white" aria-label={rightLabel}>
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {rightOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSubmit} disabled={isPending} variant="accent" className="w-fit">
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success">Assigned.</p>}
    </div>
  );
}
