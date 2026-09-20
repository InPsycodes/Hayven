"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDate } from "@/data/format";
import { listReferralsForReferrer, type ReferralStatus, type ReferralListItem } from "@/lib/referrals/actions";

const STATUS_LABEL: Record<ReferralStatus, string> = {
  received: "Referral received",
  family_contacted: "Family contacted",
  assessment_scheduled: "Assessment scheduled",
  care_started: "Care started",
};

const STATUS_STYLE: Record<ReferralStatus, string> = {
  received: "bg-offwhite text-ink-soft",
  family_contacted: "bg-terracotta/10 text-terracotta",
  assessment_scheduled: "bg-terracotta/10 text-terracotta",
  care_started: "bg-success/15 text-success-text",
};

export function ReferralStatusLookup() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ReferralListItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await listReferralsForReferrer(code, email);
      if (!res.ok) {
        setError(res.error);
        setResults(null);
        return;
      }
      setResults(res.results);
    });
  }

  if (results) {
    return (
      <div className="reveal mx-auto max-w-lg">
        <p className="text-sm text-ink-soft">
          {results.length} {results.length === 1 ? "referral" : "referrals"} tied to this email
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {results.map((r) => (
            <div
              key={r.referenceCode}
              className="flex items-center justify-between gap-4 rounded-lg border border-offwhite bg-canvas-white px-4.5 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">{r.childName}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{r.referenceCode}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[r.status])}>
                  {STATUS_LABEL[r.status]}
                </span>
                <p className="mt-1 text-[0.7rem] text-muted-foreground">Since {formatDate(r.statusUpdatedAt)}</p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setResults(null)}>
          Check a different code
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl text-charcoal">Track your referrals</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Enter one reference code and the email from your confirmation -- we&apos;ll show every referral tied to
          that email.
        </p>
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
