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
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[56px_repeat(7,1fr)]">
          <div />
          {days.map((day) => {
            const iso = day.toISOString().slice(0, 10);
            const isToday = iso === todayISO;
            const isWeekend = [0, 6].includes(day.getUTCDay());
            return (
              <div
                key={iso}
                className={cn(
                  "flex flex-col items-center gap-0.5 border-b border-border py-2 text-center",
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
              {days.map((day) => {
                const iso = day.toISOString().slice(0, 10);
                const isWeekend = [0, 6].includes(day.getUTCDay());
                const { state, slot, booking } = stateFor(iso, hour);
                return (
                  <div
                    key={`${iso}-${hour}`}
                    className={cn(
                      "min-h-14 border-b border-l border-border p-1",
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
