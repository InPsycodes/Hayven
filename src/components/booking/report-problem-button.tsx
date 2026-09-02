"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatNaira } from "@/data/format";
import { openDispute } from "@/lib/disputes/actions";
import type { MyDispute } from "@/lib/disputes/queries";

const RESOLUTION_LABEL: Record<string, string> = {
  full_refund: "Full refund",
  partial_refund: "Partial refund",
  no_action: "No change",
};

export function ReportProblemButton({
  bookingId,
  dispute,
}: {
  bookingId: string;
  dispute: MyDispute | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (dispute && !sent) {
    if (dispute.status === "open") {
      return <span className="text-xs text-muted-foreground">Reported — under review</span>;
    }
    return (
      <span className="text-xs text-muted-foreground">
        Reviewed: {RESOLUTION_LABEL[dispute.resolution ?? ""] ?? "resolved"}
        {dispute.refundAmount ? ` (${formatNaira(dispute.refundAmount)})` : ""}
      </span>
    );
  }

  if (sent) {
    return <span className="fade-in text-xs text-muted-foreground">Reported. We&apos;ll be in touch.</span>;
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-charcoal"
      >
        Report a problem
      </button>
    );
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await openDispute(bookingId, reason);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSent(true);
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-72">
      <p className="text-xs text-muted-foreground">
        Tell us what went wrong. Hayven reviews it and follows up &mdash; you have 7 days after a session.
      </p>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="What happened?"
        aria-label="Describe the problem"
        className="text-xs"
      />
      {error && <p className="text-xs text-error-text">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Sending..." : "Send report"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
