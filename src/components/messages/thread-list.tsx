import Link from "next/link";

import { initialsFromName } from "@/data/format";
import type { RealThreadPreview } from "@/lib/messages/queries";

export function ThreadList({
  threads,
  basePath,
}: {
  threads: RealThreadPreview[];
  basePath: string;
}) {
  if (threads.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted-foreground md:px-10">
        No conversations yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border px-5 md:px-10">
      {threads.map((thread) => (
        <Link
          key={thread.bookingId}
          href={`${basePath}/${thread.bookingId}`}
          className="flex items-center gap-3 py-4 hover:opacity-80"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-medium text-charcoal">
            {initialsFromName(thread.counterpartName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-charcoal">{thread.counterpartName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {thread.lastMessage ?? "No messages yet -- say hello."}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
