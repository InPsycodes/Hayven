"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowUp } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { initialsFromName } from "@/data/format";
import { sendRealMessage } from "@/lib/messages/actions";
import { useSubmitGuard } from "@/hooks/use-submit-guard";

export interface ThreadMessage {
  id: string;
  senderId: string;
  sentAt: string;
  content: string;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MessageThreadView({
  bookingId,
  backHref,
  currentUserId,
  counterpartName,
  counterpartRole,
  messages,
}: {
  bookingId: string;
  backHref: string;
  currentUserId: string;
  counterpartName: string;
  counterpartRole: string;
  messages: ThreadMessage[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const rows = useMemo(
    () =>
      messages.map((message, index) => {
        const label = dayLabel(message.sentAt);
        const prevLabel = index > 0 ? dayLabel(messages[index - 1].sentAt) : "";
        return { message, showDivider: label !== prevLabel, label };
      }),
    [messages]
  );

  const { guard, reset } = useSubmitGuard();

  const handleSend = guard((e: React.FormEvent) => {
    e.preventDefault();
    const content = draft;
    if (!content.trim()) {
      reset();
      return;
    }
    setDraft("");
    startTransition(async () => {
      await sendRealMessage(bookingId, content);
      router.refresh();
      reset(); // each submit sends a new, distinct message -- not a one-time action
    });
  });

  return (
    <div className="flex h-screen flex-col bg-care-bg text-care-ink">
      <div className="flex items-center gap-3 border-b border-care-line/60 bg-care-surface px-4 py-3.5">
        <Link
          href={backHref}
          className="text-care-ink-faint hover:text-care-ink"
          aria-label="Back to messages"
        >
          <IconArrowLeft size={20} />
        </Link>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-care-accent text-xs font-medium text-white">
          {initialsFromName(counterpartName)}
        </span>
        <div>
          <h1 className="text-sm font-medium text-care-ink">{counterpartName}</h1>
          <p className="text-xs capitalize text-care-ink-faint">{counterpartRole}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-care-ink-soft">No messages yet. Say hello.</p>
          )}
          {rows.map(({ message, showDivider, label }) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div key={message.id} className="flex flex-col gap-3">
                {showDivider && (
                  <div className="flex justify-center">
                    <span className="rounded-full bg-care-surface px-3 py-1 text-[11px] text-care-ink-soft">
                      {label}
                    </span>
                  </div>
                )}
                <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-[20px] px-4 py-2.5 text-sm leading-relaxed",
                      isOwn
                        ? "bg-care-accent text-white"
                        : "border border-care-line/60 bg-care-surface text-care-ink"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-care-line/60 bg-care-surface px-4 py-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${counterpartName.split(" ")[0]}`}
          aria-label={`Message ${counterpartName}`}
          className="h-11 flex-1 rounded-full border border-care-line/60 bg-care-bg px-4 text-sm text-care-ink outline-none focus-visible:ring-2 focus-visible:ring-care-accent/40 placeholder:text-care-ink-faint"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          aria-label="Send message"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-terracotta text-white transition-opacity disabled:opacity-40"
        >
          <IconArrowUp size={17} stroke={2} />
        </button>
      </form>
    </div>
  );
}
