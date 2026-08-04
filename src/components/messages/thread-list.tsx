import Link from "next/link";

import { initialsFromName } from "@/data/format";
import type { MessageThreadPreview } from "@/data/queries";

export function ThreadList({
  threads,
  basePath,
}: {
  threads: MessageThreadPreview[];
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
            {initialsFromName(thread.counterpart.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-charcoal">
                {thread.counterpart.fullName}
              </p>
              {thread.unread && <span className="size-2 shrink-0 rounded-full bg-terracotta" />}
            </div>
            <p className="truncate text-xs text-muted-foreground">{thread.lastMessage.content}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
