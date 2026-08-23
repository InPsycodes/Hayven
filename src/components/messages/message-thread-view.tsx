"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowUp, IconPaperclip } from "@tabler/icons-react";

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
    <div className="flex h-screen flex-col md:h-[calc(100vh-0px)]">
      <div className="flex items-center gap-3 bg-charcoal px-4 py-4 text-offwhite">
        <Link href={backHref} className="text-offwhite/70 hover:text-offwhite">
          <IconArrowLeft size={20} />
        </Link>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-terracotta text-xs font-medium text-white">
          {initialsFromName(counterpartName)}
        </span>
        <div>
          <p className="text-sm font-medium">{counterpartName}</p>
          <p className="text-xs capitalize text-offwhite/60">{counterpartRole}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-offwhite px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No messages yet. Say hello.
            </p>
          )}
          {rows.map(({ message, showDivider, label }) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div key={message.id} className="flex flex-col gap-3">
                {showDivider && (
                  <div className="flex justify-center">
                    <span className="rounded-full bg-paper px-3 py-1 text-[11px] text-charcoal/70">
                      {label}
                    </span>
                  </div>
                )}
                <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-2.5 text-sm leading-relaxed",
                      isOwn
                        ? "rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-[3px] bg-charcoal text-offwhite"
                        : "rounded-tl-md rounded-tr-md rounded-br-md rounded-bl-[3px] bg-white text-charcoal ring-1 ring-border"
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

      <form onSubmit={handleSend} className="flex items-center gap-2 bg-white px-4 py-3">
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-charcoal"
        >
          <IconPaperclip size={19} stroke={1.75} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${counterpartName.split(" ")[0]}`}
          className="h-11 flex-1 rounded-full bg-offwhite px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-terracotta text-white transition-opacity disabled:opacity-40"
        >
          <IconArrowUp size={17} stroke={2} />
        </button>
      </form>
    </div>
  );
}
