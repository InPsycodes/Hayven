"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconSend } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { initialsFromName, shortName } from "@/data/format";
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

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const GROUP_GAP_MS = 4 * 60 * 1000;

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () =>
      messages.map((message, index) => {
        const prev = index > 0 ? messages[index - 1] : null;
        const next = index < messages.length - 1 ? messages[index + 1] : null;
        const label = dayLabel(message.sentAt);
        const showDivider = !prev || dayLabel(prev.sentAt) !== label;
        const isOwn = message.senderId === currentUserId;

        const contWithPrev =
          !!prev &&
          prev.senderId === message.senderId &&
          !showDivider &&
          new Date(message.sentAt).getTime() - new Date(prev.sentAt).getTime() < GROUP_GAP_MS;
        const contWithNext =
          !!next &&
          next.senderId === message.senderId &&
          dayLabel(next.sentAt) === label &&
          new Date(next.sentAt).getTime() - new Date(message.sentAt).getTime() < GROUP_GAP_MS;

        return { message, isOwn, showDivider, label, contWithPrev, contWithNext };
      }),
    [messages, currentUserId]
  );

  // Stick to the bottom on load and whenever the message count changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

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
    <div className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-care-bg text-care-ink md:static md:z-auto">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-care-line/60 bg-care-surface px-3 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:pt-3">
        <Link
          href={backHref}
          className="-ml-1 flex size-11 items-center justify-center rounded-full text-care-ink-soft hover:bg-care-raised hover:text-care-ink"
          aria-label="Back to messages"
        >
          <IconArrowLeft size={20} />
        </Link>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-care-accent text-xs font-semibold text-white">
          {initialsFromName(counterpartName)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-care-ink">{counterpartName}</h1>
          <p className="truncate text-[11px] capitalize text-care-ink-faint">{counterpartRole}</p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-0.5">
          {messages.length === 0 && (
            <p className="py-16 text-center text-sm text-care-ink-soft">
              No messages yet. Say hello to {shortName(counterpartName)}.
            </p>
          )}
          {rows.map(({ message, isOwn, showDivider, label, contWithPrev, contWithNext }) => (
            <div key={message.id}>
              {showDivider && (
                <div className="flex justify-center py-3">
                  <span className="rounded-full bg-care-surface px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-wide text-care-ink-faint">
                    {label}
                  </span>
                </div>
              )}
              <div className={cn("flex", isOwn ? "justify-end" : "justify-start", contWithPrev ? "mt-0.5" : "mt-2")}>
                <div
                  className={cn(
                    "relative max-w-[80%] px-3 py-1.5 text-[14px] leading-relaxed",
                    isOwn
                      ? "bg-care-accent text-white"
                      : "border border-care-line/60 bg-care-surface text-care-ink",
                    // rounded bubble; the corner nearest the "tail" squares off
                    // only on the last message of a run
                    "rounded-[18px]",
                    isOwn && !contWithNext && "rounded-br-[6px]",
                    !isOwn && !contWithNext && "rounded-bl-[6px]"
                  )}
                >
                  <span className="whitespace-pre-wrap break-words">{message.content}</span>
                  <span
                    className={cn(
                      "float-right ml-2 mt-1 translate-y-0.5 text-[10px] tabular-nums",
                      isOwn ? "text-white/70" : "text-care-ink-faint"
                    )}
                  >
                    {timeLabel(message.sentAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="flex shrink-0 items-end gap-2 border-t border-care-line/60 bg-care-surface px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] md:pb-2.5"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          placeholder={`Message ${shortName(counterpartName)}`}
          aria-label={`Message ${counterpartName}`}
          enterKeyHint="send"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-care-line/60 bg-care-bg px-4 py-2.5 text-base text-care-ink outline-none focus-visible:border-care-accent/60 placeholder:text-care-ink-faint"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          aria-label="Send message"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-care-accent text-white transition-opacity disabled:opacity-40"
        >
          <IconSend size={17} stroke={2} />
        </button>
      </form>
    </div>
  );
}
