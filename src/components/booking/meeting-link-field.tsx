"use client";

import { useState, useTransition } from "react";
import { IconVideo } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setMeetingLink } from "@/lib/booking/actions";
import { JoinSessionButton } from "@/components/booking/join-session-button";

/**
 * Therapist-side control for a confirmed virtual booking: paste any video
 * room URL (Meet, Zoom personal room, Whereby, ...). Once saved it collapses
 * to the same "Join session" button the parent sees, plus an edit affordance.
 */
export function MeetingLinkField({
  bookingId,
  startTime,
  initialLink,
}: {
  bookingId: string;
  startTime: string;
  initialLink: string | null;
}) {
  const [saved, setSaved] = useState<string | null>(initialLink);
  const [link, setLink] = useState(initialLink ?? "");
  const [editing, setEditing] = useState(!initialLink);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setMeetingLink(bookingId, link);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(res.meetingLink);
      setLink(res.meetingLink ?? "");
      setEditing(!res.meetingLink);
    });
  }

  if (!editing && saved) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <JoinSessionButton meetingLink={saved} startTime={startTime} />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-charcoal"
        >
          Edit video link
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconVideo size={13} stroke={1.75} />
          Video link
        </span>
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://meet.google.com/..."
          inputMode="url"
          className="h-8 min-w-0 flex-1 basis-48 text-xs"
        />
        <Button size="sm" onClick={save} disabled={isPending} className="shrink-0">
          {isPending ? "Saving..." : "Save"}
        </Button>
        {saved && (
          <button
            type="button"
            onClick={() => {
              setLink(saved);
              setEditing(false);
              setError(null);
            }}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Paste a Google Meet, Zoom, or other call link. The parent is notified and can join from 10 minutes before the session.
      </p>
      {error && <p className="text-xs text-error-text">{error}</p>}
    </div>
  );
}
