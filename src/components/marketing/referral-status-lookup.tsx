"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDate } from "@/data/format";
import { checkReferralStatus, type ReferralStatus, type ReferralStatusResult } from "@/lib/referrals/actions";

const STEPS: { key: ReferralStatus; label: string }[] = [
  { key: "received", label: "Referral received" },
  { key: "family_contacted", label: "Family contacted" },
  { key: "assessment_scheduled", label: "Assessment scheduled" },
  { key: "care_started", label: "Care started" },
];

export function ReferralStatusLookup() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReferralStatusResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await checkReferralStatus(code, email);
      if (!res.ok) {
        setError(res.error);
        setResult(null);
        return;
      }
      setResult(res.result);
    });
  }

  if (result) {
    const currentIndex = STEPS.findIndex((s) => s.key === result.status);
    return (
      <div className="reveal mx-auto max-w-md">
        <p className="text-sm text-ink-soft">
          Referral for <span className="font-medium text-charcoal">{result.childName}</span>
        </p>
        <div className="mt-6 flex flex-col">
          {STEPS.map((step, i) => {
            const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "pending";
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      state === "done" && "bg-success text-white",
                      state === "current" && "bg-terracotta text-white ring-4 ring-terracotta/15",
                      state === "pending" && "border border-charcoal/20 bg-offwhite text-transparent"
                    )}
                  >
                    {state === "done" ? "✓" : ""}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className={cn("w-px flex-1", state === "done" ? "bg-success" : "bg-charcoal/15")} />
                  )}
                </div>
                <div className={cn("pb-6", state === "pending" && "opacity-50")}>
                  <p className="text-sm font-medium text-charcoal">{step.label}</p>
                  {state === "current" && (
                    <p className="text-xs text-muted-foreground">Since {formatDate(result.statusUpdatedAt)}</p>
                  )}
                  {state === "done" && step.key === "received" && (
                    <p className="text-xs text-muted-foreground">{formatDate(result.createdAt)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setResult(null)}>
          Check a different referral
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl text-charcoal">Track a referral</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Enter the reference code and email from your confirmation.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="referenceCode">Reference code</Label>
        <Input
          id="referenceCode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="HYV-REF-XXXXX"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="statusEmail">Your email</Label>
        <Input
          id="statusEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@clinic.com"
          required
        />
      </div>
      {error && <p className="text-sm text-error-text">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Checking..." : "Check status"}
      </Button>
    </form>
  );
}
