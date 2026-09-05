"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { resolveSupportRequest } from "@/lib/admin/actions";
import { formatDateTime, initialsFromName } from "@/data/format";
import type { RealSupportRequest } from "@/lib/admin/queries";

export function SupportRequestRow({ request }: { request: RealSupportRequest }) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();
  const isOpen = request.status === "open";

  const handleResolve = guard(() => {
    setError(null);
    startTransition(async () => {
      const result = await resolveSupportRequest(request.id, reply);
      if (!result.ok) {
        setError(result.error);
        reset();
      }
    });
  });

  return (
    <div className="flex flex-col gap-2 px-3 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-medium text-charcoal">
            {initialsFromName(request.requester.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">
              {request.subject}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                from {request.requester.fullName} ({request.requester.role})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{request.requester.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            {formatDateTime(request.createdAt)}
          </span>
          <StatusBadge tone={isOpen ? "amber" : "sage"}>{isOpen ? "Open" : "Resolved"}</StatusBadge>
        </div>
      </div>

      <p className="rounded-sm bg-[#F6F4F0] p-2.5 text-sm text-charcoal">{request.message}</p>

      {isOpen ? (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply. Sent to the requester by email and in-app."
          />
          <div className="flex items-center gap-3">
            <Button size="sm" variant="accent" disabled={isPending} onClick={handleResolve} className="w-fit">
              {isPending ? "Sending..." : "Send reply & resolve"}
            </Button>
            {error && <p className="text-xs text-error-text">{error}</p>}
          </div>
        </div>
      ) : (
        request.resolution && (
          <div className="rounded-sm bg-white p-2.5 ring-1 ring-border">
            <p className="label-micro text-rust-dark">Our reply</p>
            <p className="mt-1 text-sm text-charcoal">{request.resolution}</p>
            {request.resolvedAt && (
              <p className="mt-1 text-[11px] text-muted-foreground">Resolved {formatDateTime(request.resolvedAt)}</p>
            )}
          </div>
        )
      )}
    </div>
  );
}
