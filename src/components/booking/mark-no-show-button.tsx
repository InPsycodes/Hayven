"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { markNoShow, undoNoShow } from "@/lib/booking/actions";

export function MarkNoShowButton({
  bookingId,
  isNoShow,
  note,
}: {
  bookingId: string;
  isNoShow: boolean;
  note: string | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const n = formData.get("note");
    setError(null);
    start(async () => {
      const res = await markNoShow(bookingId, typeof n === "string" ? n : undefined);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function undo() {
    setError(null);
    start(async () => {
      const res = await undoNoShow(bookingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (isNoShow) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-amber/15 px-2 py-0.5 font-medium text-amber">No-show</span>
          <button type="button" onClick={undo} disabled={pending} className="underline underline-offset-2 hover:text-charcoal">
            Undo
          </button>
        </div>
        {note && <p className="text-[11px] text-muted-foreground">&ldquo;{note}&rdquo;</p>}
        {error && <p className="text-xs text-error-text">{error}</p>}
      </div>
    );
  }

  if (!expanded) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)} className="shrink-0">
        Mark no-show
      </Button>
    );
  }

  return (
    <form action={submit} className="flex w-full flex-col gap-2 sm:w-64">
      <p className="text-xs text-muted-foreground">
        The family didn&apos;t attend. Recorded for your records &mdash; no automatic refund or penalty.
      </p>
      <Textarea
        name="note"
        rows={2}
        placeholder="Note (optional, seen by Hayven only)"
        aria-label="No-show note"
        className="text-xs"
      />
      {error && <p className="text-xs text-error-text">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving..." : "Confirm no-show"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
