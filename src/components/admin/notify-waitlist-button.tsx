"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { notifyLaunchWaitlist, type NotifyWaitlistResult } from "@/lib/waitlist/actions";

/**
 * Sends the one-time "therapists are live" email to families on the launch
 * waitlist. Two clicks on purpose (it emails real people and can't be
 * undone); disabled until a therapist is live in search.
 */
export function NotifyWaitlistButton({ waiting, liveTherapists }: { waiting: number; liveTherapists: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<NotifyWaitlistResult | null>(null);
  const [pending, start] = useTransition();

  if (waiting === 0 && !result) return null;

  function send() {
    setConfirming(false);
    start(async () => {
      const r = await notifyLaunchWaitlist();
      setResult(r);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      {liveTherapists === 0 ? (
        <p className="text-xs text-muted-foreground">
          You can email the {waiting} waiting {waiting === 1 ? "family" : "families"} once a therapist is live in search.
        </p>
      ) : confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-charcoal">
            Email {Math.min(waiting, 50)} {waiting === 1 ? "family" : "families"} that therapists are live? This can&apos;t be undone.
          </span>
          <Button size="sm" onClick={send}>
            Send
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        waiting > 0 && (
          <Button size="sm" variant="outline" className="w-fit" disabled={pending} onClick={() => setConfirming(true)}>
            {pending ? "Sending..." : `Email waiting families (${waiting})`}
          </Button>
        )
      )}
      {result &&
        (result.ok ? (
          <p className="text-xs text-success-text">
            Sent to {result.sent} {result.sent === 1 ? "family" : "families"}.
            {result.remaining > 0 && ` ${result.remaining} still waiting: press again to send the next batch.`}
          </p>
        ) : (
          <p className="text-xs text-error-text">{result.error}</p>
        ))}
    </div>
  );
}
