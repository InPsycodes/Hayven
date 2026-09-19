"use client";

import { useSyncExternalStore } from "react";
import { IconVideo } from "@tabler/icons-react";

// The link is live from 10 minutes before the session start until an hour
// after -- early enough to settle in, late enough to cover an over-running
// session, then it disappears so a stale tab doesn't keep showing it.
const OPENS_BEFORE_MS = 10 * 60 * 1000;
const CLOSES_AFTER_MS = 60 * 60 * 1000;

// A tiny shared clock: subscribers re-render ~every 30s so a page left open
// crosses the "join opens" boundary on its own. The snapshot is the wall
// time captured on subscribe and on each tick (stable between ticks, so no
// render loop and nothing impure read during render). The server snapshot
// is 0 -- a sentinel meaning "not hydrated yet" so the UI renders a stable
// placeholder first.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let nowMs = 0;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  nowMs = Date.now();
  timer ??= setInterval(() => {
    nowMs = Date.now();
    listeners.forEach((l) => l());
  }, 30_000);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function useNowMs(): number | null {
  const value = useSyncExternalStore(
    subscribe,
    () => nowMs,
    () => 0
  );
  return value === 0 ? null : value;
}

export function JoinSessionButton({
  meetingLink,
  startTime,
}: {
  meetingLink: string | null;
  startTime: string;
}) {
  const now = useNowMs();

  if (!meetingLink || now === null || !startTime) return null;

  const start = new Date(startTime).getTime();
  if (now > start + CLOSES_AFTER_MS) return null;

  if (now < start - OPENS_BEFORE_MS) {
    return (
      <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
        <IconVideo size={13} stroke={1.75} />
        Join opens 10 min before
      </span>
    );
  }

  return (
    <a
      href={meetingLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <IconVideo size={13} stroke={2} />
      Join session
    </a>
  );
}
