import Link from "next/link";

import { cn } from "@/lib/utils";
import { initialsFromName } from "@/data/format";
import type { RealVerificationRequest } from "@/lib/admin/queries";

const STATUS_FILTERS: { key: string; label: string; statuses: string[] }[] = [
  { key: "pending", label: "Pending", statuses: ["submitted", "in_review"] },
  { key: "flagged", label: "Flagged", statuses: ["needs_more_info"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
];

function timeSince(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function VerificationQueueList({
  requests,
  allRequests,
  activeFilter,
  activeId,
}: {
  requests: RealVerificationRequest[];
  allRequests: RealVerificationRequest[];
  activeFilter: string;
  activeId?: string;
}) {
  const pendingCount = allRequests.filter((r) =>
    ["submitted", "in_review"].includes(r.status)
  ).length;

  return (
    <div className="flex w-full shrink-0 flex-col bg-paper md:w-85">
      <div className="p-5">
        <h1 className="font-heading text-lg text-charcoal">Verification queue</h1>
        <p className="text-xs text-muted-foreground">{pendingCount} pending review</p>

        <div className="mt-4 flex gap-1.5">
          {STATUS_FILTERS.map((filter) => {
            const count = allRequests.filter((r) => filter.statuses.includes(r.status)).length;
            const active = activeFilter === filter.key;
            return (
              <Link
                key={filter.key}
                href={`/admin/verification?status=${filter.key}`}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-charcoal text-offwhite" : "bg-white text-charcoal hover:bg-white/70"
                )}
              >
                {filter.label} ({count})
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto px-5 pb-5">
        {requests.length === 0 ? (
          <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground">
            No applications in this view.
          </p>
        ) : (
          requests.map((request, index) => {
            const isSelected = request.id === activeId;
            const isOldest = index === 0 && activeFilter === "pending";
            return (
              <Link
                key={request.id}
                href={`/admin/verification?status=${activeFilter}&applicationId=${request.id}`}
                className={cn(
                  "flex flex-col gap-1 rounded-sm border-l-[3px] bg-white p-3.5 transition-colors",
                  isOldest ? "border-l-terracotta" : "border-l-transparent",
                  isSelected && "ring-1 ring-charcoal/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-medium text-charcoal">
                    {initialsFromName(request.therapist.displayName)}
                  </span>
                  <span className="truncate text-sm font-medium text-charcoal">
                    {request.therapist.displayName}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {request.therapist.specialties.join(", ")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Submitted {timeSince(request.submittedAt)}
                </p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
