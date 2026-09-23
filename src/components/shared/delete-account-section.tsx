"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { requestAccountDeletion } from "@/lib/account/actions";
import type { FormState } from "@/lib/account/actions";
import { formatDate } from "@/data/format";
import type { RealPendingDeletionRequest } from "@/lib/account/queries";

const initialState: FormState = {};

export function DeleteAccountSection({
  pendingRequest,
}: {
  pendingRequest: RealPendingDeletionRequest | null;
}) {
  const [state, formAction, isPending] = useActionState(requestAccountDeletion, initialState);
  const [expanded, setExpanded] = useState(false);

  const submitted = pendingRequest || (state !== initialState && !state.error);

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-error/30 bg-card p-5">
      <div>
        <h2 className="font-heading text-base text-charcoal">Delete my account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This isn&apos;t instant; a member of our team reviews every request and follows up by email
          before anything is deleted, since records tied to your account may still be in active use.
        </p>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2">
          <StatusBadge tone="amber">Request pending</StatusBadge>
          <span className="text-sm text-muted-foreground">
            {pendingRequest
              ? `Submitted ${formatDate(pendingRequest.requestedAt)}. We'll be in touch.`
              : "We'll be in touch by email."}
          </span>
        </div>
      ) : expanded ? (
        <form action={formAction} className="reveal flex flex-col gap-3">
          <Textarea
            name="reason"
            rows={3}
            placeholder="Anything you'd like us to know? (optional)"
          />
          {state.error && <p className="text-sm text-error-text">{state.error}</p>}
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="outline"
              disabled={isPending}
              className="w-fit border-error text-error-text hover:bg-error/5"
            >
              {isPending ? "Submitting..." : "Confirm request"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setExpanded(false)} className="w-fit">
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setExpanded(true)}
          className="w-fit border-error text-error-text hover:bg-error/5"
        >
          Request account deletion
        </Button>
      )}
    </div>
  );
}
