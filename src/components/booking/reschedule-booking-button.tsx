"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatDateTime, formatShortDate, formatTime } from "@/data/format";
import { getRescheduleOptions, rescheduleBooking, type RescheduleOption } from "@/lib/booking/actions";

export function RescheduleBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "picking" | "done">("idle");
  const [options, setOptions] = useState<RescheduleOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("");
  const [loading, startLoading] = useTransition();
  const [saving, startSave] = useTransition();

  function open() {
    setError(null);
    startLoading(async () => {
      const res = await getRescheduleOptions(bookingId);
      setPhase("picking");
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOptions(res.options);
    });
  }

  function confirm() {
    if (!selected) return;
    setError(null);
    startSave(async () => {
      const res = await rescheduleBooking(bookingId, selected);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNewStart(res.newStart);
      setPhase("done");
      router.refresh();
    });
  }

  function reset() {
    setPhase("idle");
    setError(null);
    setSelected(null);
    setOptions([]);
  }

  if (phase === "done") {
    return (
      <span className="fade-in shrink-0 text-xs text-muted-foreground">Moved to {formatDateTime(newStart)}.</span>
    );
  }

  if (phase === "idle") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={open} disabled={loading} className="shrink-0">
        {loading ? "Loading..." : "Reschedule"}
      </Button>
    );
  }

  const byDay = new Map<string, RescheduleOption[]>();
  for (const o of options) {
    const key = o.startTime.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), o]);
  }
  const days = [...byDay.keys()].sort();

  return (
    <div className="flex w-full flex-col gap-2 sm:w-72">
      {error && <p className="text-xs text-error-text">{error}</p>}
      {!error && options.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No other open times right now. Try again later, or cancel instead.
        </p>
      )}
      {options.length > 0 && (
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-sm border border-border bg-card p-2">
          {days.map((day) => (
            <div key={day}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {formatShortDate(`${day}T12:00:00Z`)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {byDay.get(day)!.map((o) => (
                  <button
                    key={o.slotId}
                    type="button"
                    onClick={() => setSelected(o.slotId)}
                    aria-pressed={selected === o.slotId}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      selected === o.slotId
                        ? "border-terracotta bg-terracotta/10 text-charcoal"
                        : "border-border text-muted-foreground hover:border-charcoal/30"
                    }`}
                  >
                    {formatTime(o.startTime)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {options.length > 0 && (
          <Button type="button" size="sm" onClick={confirm} disabled={!selected || saving}>
            {saving ? "Moving..." : "Confirm new time"}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          {options.length > 0 ? "Never mind" : "Close"}
        </Button>
      </div>
    </div>
  );
}
