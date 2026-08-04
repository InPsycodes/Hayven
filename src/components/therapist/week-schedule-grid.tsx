import { cn } from "@/lib/utils";
import { formatTime } from "@/data/format";

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16];

type CellState = "next" | "booked" | "blocked" | "open";

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
  weekStart: Date; // Monday, UTC midnight
  slots: ScheduleSlot[];
  bookings: ScheduleBooking[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });

  const todayISO = new Date().toISOString().slice(0, 10);

  const bookingBySlotId = new Map(bookings.map((b) => [b.availabilitySlotId, b]));
  const nextBooking = bookings
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  function stateFor(dateISO: string, hour: number): { state: CellState; slot?: ScheduleSlot; booking?: ScheduleBooking } {
    const slot = slots.find(
      (s) => s.startTime.startsWith(dateISO) && new Date(s.startTime).getUTCHours() === hour
    );
    if (!slot) return { state: "open" };
    if (!slot.isBooked) return { state: "open", slot };

    const booking = bookingBySlotId.get(slot.id);
    if (booking) {
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
                      isWeekend && state === "open" && "bg-paper/30"
                    )}
                  >
                    {state !== "open" && slot && (
                      <div
                        className={cn(
                          "flex h-full flex-col justify-center rounded-sm px-2 py-1 text-[11px] leading-tight",
                          state === "next" && "bg-charcoal text-offwhite",
                          state === "booked" && "bg-paper text-charcoal",
                          state === "blocked" && "bg-charcoal/20 text-charcoal/60"
                        )}
                      >
                        {booking ? (
                          <>
                            <span className="font-medium">{booking.childFirstName}</span>
                            <span className="opacity-70">{formatTime(slot.startTime)}</span>
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
        <Legend swatchClassName="bg-charcoal" label="Next session" />
        <Legend swatchClassName="bg-paper" label="Booked" />
        <Legend swatchClassName="bg-charcoal/20" label="Blocked/unavailable" />
        <Legend swatchClassName="bg-white ring-1 ring-border" label="Open slot" />
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
