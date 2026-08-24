"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { requestSupervisorAccess } from "@/lib/therapist/actions";
import type { FormState } from "@/lib/therapist/actions";
import { formatDate } from "@/data/format";
import type { RealSupervisorRequestStatus } from "@/lib/therapist/queries";

const initialState: FormState = {};

export function SupervisorAccessSection({
  isSupervisor,
  latestRequest,
}: {
  isSupervisor: boolean;
  latestRequest: RealSupervisorRequestStatus | null;
}) {
  const [state, formAction, isPending] = useActionState(requestSupervisorAccess, initialState);
  const [expanded, setExpanded] = useState(false);

  const justSubmitted = state !== initialState && !state.error;
  const pending = !isSupervisor && (latestRequest?.status === "pending" || justSubmitted);
  const denied = !isSupervisor && !pending && latestRequest?.status === "denied";

  return (
    <div className="flex flex-col gap-3 rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <div>
        <h2 className="font-heading text-base text-charcoal">Supervisor access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Oversee other therapists&apos; sessions and progress reports for children assigned to your team,
          while keeping your own caseload and schedule exactly as they are.
        </p>
      </div>

      {isSupervisor ? (
        <div className="flex items-center gap-2">
          <StatusBadge tone="sage">Active</StatusBadge>
          <Link href="/supervisor" className="text-sm font-medium text-terracotta hover:underline">
            Go to Supervisor portal
          </Link>
        </div>
      ) : pending ? (
        <div className="flex items-center gap-2">
          <StatusBadge tone="amber">Request pending</StatusBadge>
          <span className="text-sm text-muted-foreground">
            {latestRequest ? `Submitted ${formatDate(latestRequest.requestedAt)}.` : "An admin will review this."}
          </span>
        </div>
      ) : expanded ? (
        <form action={formAction} className="flex flex-col gap-3">
          {denied && (
            <p className="text-sm text-muted-foreground">
              Your last request wasn&apos;t approved. You can submit a new one.
            </p>
          )}
          <Textarea
            name="note"
            rows={3}
            placeholder="Anything you'd like the admin to know? (optional)"
          />
          {state.error && <p className="text-sm text-error-text">{state.error}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="outline" disabled={isPending} className="w-fit">
              {isPending ? "Submitting..." : "Submit request"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setExpanded(false)} className="w-fit">
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-start gap-2">
          {denied && <p className="text-sm text-muted-foreground">Your last request wasn&apos;t approved.</p>}
          <Button type="button" variant="outline" onClick={() => setExpanded(true)} className="w-fit">
            {denied ? "Request again" : "Request supervisor access"}
          </Button>
        </div>
      )}
    </div>
  );
}
