"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { submitSupportRequest } from "@/lib/account/actions";
import type { FormState } from "@/lib/account/actions";
import { formatDateTime } from "@/data/format";
import type { RealSupportRequest } from "@/lib/account/queries";

const initialState: FormState = {};

export function SupportRequestSection({ requests }: { requests: RealSupportRequest[] }) {
  const [state, formAction, isPending] = useActionState(submitSupportRequest, initialState);
  const [expanded, setExpanded] = useState(false);
  const succeeded = state !== initialState && !state.error;

  return (
    <div className="flex flex-col gap-4 rounded-sm bg-white p-5 ring-1 ring-border">
      <div>
        <h2 className="font-heading text-base text-charcoal">Contact support</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Can&apos;t find the answer above? Send us a message and we&apos;ll reply here and by email.
        </p>
      </div>

      {expanded ? (
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required placeholder="What's this about?" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" required rows={4} placeholder="Tell us what's going on." />
          </div>
          {state.error && <p className="text-sm text-error-text">{state.error}</p>}
          {succeeded && <p className="fade-in text-sm text-success-text">Sent — we&apos;ll reply here and by email.</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending ? "Sending..." : "Send message"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setExpanded(false)} className="w-fit">
              Close
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" onClick={() => setExpanded(true)} className="w-fit">
          New support request
        </Button>
      )}

      {requests.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {requests.map((r) => (
            <div key={r.id} className="rounded-sm bg-[#F6F4F0] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-charcoal">{r.subject}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                  <StatusBadge tone={r.status === "resolved" ? "sage" : "amber"}>
                    {r.status === "resolved" ? "Resolved" : "Open"}
                  </StatusBadge>
                </div>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.message}</p>
              {r.resolution && (
                <div className="mt-2 rounded-sm bg-white p-2.5">
                  <p className="label-micro text-rust-dark">Our reply</p>
                  <p className="mt-1 text-sm text-charcoal">{r.resolution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
