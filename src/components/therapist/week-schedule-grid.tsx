"use client";

import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { formatTime, toLagosWallClock } from "@/data/format";
import { OpenSlotChip } from "@/components/therapist/open-slot-chip";

// 8am–7pm covers typical practice hours; a slot the therapist adds outside
// this range still won't show a chip, so keep it generous.
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

type CellState = "next" | "booked" | "pending" | "blocked" | "open";

/** Purpose-built, minimal shapes -- works for both mock and real data sources. */
export interface ScheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  sessionType: string;
}

export interface ScheduleBooking {
  id: string;
  availabilitySlotId: string;
  status: string;
  startTime: string;
  childFirstName: string;
}

export function WeekScheduleGrid({
  weekStart,
  slots,
  bookings,
}: {
  weekStart: Date; // Monday, Lagos wall-clock proxy (see toLagosWallClock)
  slots: ScheduleSlot[];
  bookings: ScheduleBooking[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });

  const todayISO = toLagosWallClock(new Date()).toISOString().slice(0, 10);

  // Phones: a 3-day window with arrows, opening on today when it's in this
  // week. From md up the full week shows and the window is ignored.
  const WINDOW = 3;
  const todayIndex = days.findIndex((d) => d.toISOString().slice(0, 10) === todayISO);
  const [windowStart, setWindowStart] = useState(() =>
    Math.min(Math.max(todayIndex, 0), days.length - WINDOW)
  );
  const inWindow = (i: number) => i >= windowStart && i < windowStart + WINDOW;
  const dayLabel = (d: Date) =>
    `${d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;

  const bookingBySlotId = new Map(bookings.map((b) => [b.availabilitySlotId, b]));
  const nextBooking = bookings
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  // slot.startTime/booking.startTime are true UTC from the database --
  // convert to the same Lagos wall-clock proxy space as weekStart/dateISO
  // before comparing, so an evening slot doesn't land on the wrong day/hour.
  function stateFor(dateISO: string, hour: number): { state: CellState; slot?: ScheduleSlot; booking?: ScheduleBooking } {
    const slot = slots.find((s) => {
      const proxy = toLagosWallClock(new Date(s.startTime));
      return proxy.toISOString().startsWith(dateISO) && proxy.getUTCHours() === hour;
    });
    if (!slot) return { state: "open" };
    if (!slot.isBooked) return { state: "open", slot };

    const booking = bookingBySlotId.get(slot.id);
    if (booking) {
      if (booking.status === "pending_payment") return { state: "pending", slot, booking };
      return { state: booking.id === nextBooking?.id ? "next" : "booked", slot, booking };
    }
    return { state: "blocked", slot };
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setWindowStart((w) => Math.max(0, w - 1))}
          disabled={windowStart === 0}
          aria-label="Earlier days"
          className="flex size-10 items-center justify-center rounded-md ring-1 ring-border transition-opacity disabled:opacity-35"
        >
          <IconChevronLeft size={18} stroke={1.75} aria-hidden />
        </button>
        <span className="text-sm text-charcoal" aria-live="polite">
          {dayLabel(days[windowStart])} – {dayLabel(days[windowStart + WINDOW - 1])}
        </span>
        <button
          type="button"
          onClick={() => setWindowStart((w) => Math.min(days.length - WINDOW, w + 1))}
          disabled={windowStart === days.length - WINDOW}
          aria-label="Later days"
          className="flex size-10 items-center justify-center rounded-md ring-1 ring-border transition-opacity disabled:opacity-35"
        >
          <IconChevronRight size={18} stroke={1.75} aria-hidden />
        </button>
      </div>
      <div className="md:overflow-x-auto">
        <div className="grid grid-cols-[44px_repeat(3,1fr)] md:min-w-[720px] md:grid-cols-[56px_repeat(7,1fr)]">
          <div />
          {days.map((day, dayIndex) => {
            const iso = day.toISOString().slice(0, 10);
            const isToday = iso === todayISO;
            const isWeekend = [0, 6].includes(day.getUTCDay());
            return (
              <div
                key={iso}
                className={cn(
                  "flex-col items-center gap-0.5 border-b border-border py-2 text-center md:flex",
                  inWindow(dayIndex) ? "flex" : "hidden",
                  isToday && "bg-terracotta/10",
                  isWeekend && !isToday && "bg-paper/40"
                )}
              >
                <span
                  className={cn(
                    "label-micro",
                    isToday ? "text-terracotta" : "text-muted-foreground"
                  )}
                >
                  {day.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                </span>
                <span className={cn("text-sm font-medium", isToday ? "text-terracotta" : "text-charcoal")}>
                  {day.getUTCDate()}
                </span>
              </div>
            );
          })}

          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="flex items-start justify-end border-b border-border py-3 pr-2 text-[11px] text-muted-foreground">
                {hour % 12 === 0 ? 12 : hour % 12}
                {hour < 12 ? "am" : "pm"}
              </div>
              {days.map((day, dayIndex) => {
                const iso = day.toISOString().slice(0, 10);
                const isWeekend = [0, 6].includes(day.getUTCDay());
                const { state, slot, booking } = stateFor(iso, hour);
                return (
                  <div
                    key={`${iso}-${hour}`}
                    className={cn(
                      "min-h-14 border-b border-l border-border p-1 md:block",
                      inWindow(dayIndex) ? "block" : "hidden",
                      isWeekend && !slot && "bg-paper/30"
                    )}
                  >
                    {state === "open" && slot && (
                      <OpenSlotChip
                        slotId={slot.id}
                        label={formatTime(slot.startTime)}
                        sessionType={slot.sessionType}
                      />
                    )}
                    {state !== "open" && slot && (
                      <div
                        className={cn(
                          "flex h-full flex-col justify-center rounded-sm px-2 py-1 text-[11px] leading-tight",
                          state === "next" && "bg-terracotta text-white",
                          state === "booked" && "bg-paper text-charcoal",
                          state === "pending" && "bg-amber/10 text-amber-text ring-1 ring-inset ring-amber/30",
                          state === "blocked" && "bg-charcoal/20 text-charcoal/60"
                        )}
                      >
                        {booking ? (
                          <>
                            <span className="font-medium">{booking.childFirstName}</span>
                            <span className="opacity-70">
                              {state === "pending" ? "Awaiting payment" : formatTime(slot.startTime)}
                            </span>
                          </>
                        ) : (
                          <span>Blocked</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <Legend swatchClassName="bg-terracotta" label="Next session" />
        <Legend swatchClassName="bg-paper" label="Booked" />
        <Legend swatchClassName="bg-amber/10 ring-1 ring-amber/30" label="Awaiting payment" />
        <Legend swatchClassName="bg-charcoal/20" label="Blocked/unavailable" />
        <Legend swatchClassName="bg-card ring-1 ring-border" label="Open slot" />
      </div>
    </div>
  );
}

function Legend({ swatchClassName, label }: { swatchClassName: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-3 rounded-[2px]", swatchClassName)} />
      {label}
    </div>
  );
}
