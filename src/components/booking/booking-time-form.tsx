"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TherapistRecapCard } from "@/components/booking/therapist-recap-card";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/lib/booking-store";
import { formatTime } from "@/data/format";
import { createPendingBooking } from "@/lib/booking/actions";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { DiscoveryTherapist } from "@/lib/therapist/discovery";
import type { AvailabilitySlot, SessionType } from "@/data/types";

export interface BookingChild {
  id: string;
  firstName: string;
}

export function BookingTimeForm({
  therapist,
  kids,
  slots,
}: {
  therapist: DiscoveryTherapist;
  kids: BookingChild[];
  slots: AvailabilitySlot[];
}) {
  const router = useRouter();
  const { draft, setDraft } = useBookingStore();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [childId, setChildId] = useState(draft.childId ?? kids[0]?.id);
  const [sessionType, setSessionType] = useState<SessionType>(
    draft.sessionType ?? therapist.sessionTypes[0]
  );

  const openSlots = useMemo(
    () => slots.filter((s) => !s.isBooked && s.sessionType === sessionType),
    [slots, sessionType]
  );

  const days = useMemo(() => {
    const unique = Array.from(new Set(openSlots.map((s) => s.startTime.slice(0, 10))));
    return unique.sort().slice(0, 7);
  }, [openSlots]);

  const [selectedDay, setSelectedDay] = useState(days[0]);
  const activeDay = days.includes(selectedDay ?? "") ? selectedDay : days[0];

  const [slotId, setSlotId] = useState(draft.slotId);
  const dayTimes = openSlots.filter((s) => s.startTime.startsWith(activeDay ?? "\0"));

  const canContinue = Boolean(childId && sessionType && slotId) && !isPending;
  const { guard, reset } = useSubmitGuard();

  const handleContinue = guard(() => {
    if (!childId || !slotId) return;
    setError(null);

    if (therapist.source !== "real") {
      setDraft({ therapistId: therapist.id, childId, sessionType, slotId, bookingId: undefined });
      router.push(`/book/${therapist.id}/payment`);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createPendingBooking({
          childId,
          therapistId: therapist.id,
          slotId,
          sessionType,
        });
        if (!result.ok) {
          setError(result.error);
          reset();
          return;
        }
        setDraft({ therapistId: therapist.id, childId, sessionType, slotId, bookingId: result.bookingId });
        router.push(`/book/${therapist.id}/payment`);
      } catch {
        // A thrown action (infra failure, not one of its handled results)
        // would otherwise leave the submit guard latched and the button
        // silently dead for the rest of this mount.
        setError("Something went wrong holding your slot. Please try again.");
        reset();
      }
    });
  });

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <TherapistRecapCard therapist={therapist} />

      {kids.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label id="booking-for-label">Booking for</Label>
          <div role="radiogroup" aria-labelledby="booking-for-label" className="flex flex-wrap gap-2">
            {kids.map((child) => (
              <button
                key={child.id}
                type="button"
                role="radio"
                aria-checked={childId === child.id}
                onClick={() => setChildId(child.id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  childId === child.id
                    ? "border-charcoal bg-charcoal text-offwhite"
                    : "border-border text-charcoal hover:border-charcoal/40"
                )}
              >
                {child.firstName}
              </button>
            ))}
          </div>
        </div>
      )}

      {therapist.sessionTypes.length > 1 && (
        <div className="flex flex-col gap-2">
          <Label id="session-type-label">Session type</Label>
          <div role="radiogroup" aria-labelledby="session-type-label" className="flex gap-2">
            {therapist.sessionTypes.map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={sessionType === type}
                onClick={() => {
                  setSessionType(type);
                  setSlotId(undefined);
                }}
                className={cn(
                  "flex-1 rounded-sm border px-3 py-2 text-sm capitalize transition-colors",
                  sessionType === type
                    ? "border-terracotta text-terracotta"
                    : "border-border text-muted-foreground hover:border-charcoal/30"
                )}
              >
                {type.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label id="booking-date-label">Select a date</Label>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open dates for this session type.</p>
        ) : (
          <div role="radiogroup" aria-labelledby="booking-date-label" className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day) => {
              const date = new Date(`${day}T00:00:00Z`);
              const isWeekend = [0, 6].includes(date.getUTCDay());
              const active = day === activeDay;
              return (
                <button
                  key={day}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setSelectedDay(day);
                    setSlotId(undefined);
                  }}
                  className={cn(
                    "flex min-w-14 flex-col items-center gap-0.5 rounded-sm px-3 py-2.5 text-xs transition-colors",
                    active
                      ? "bg-charcoal text-offwhite"
                      : isWeekend
                        ? "bg-paper/60 text-muted-foreground"
                        : "bg-paper text-charcoal"
                  )}
                >
                  <span className="label-micro opacity-70">
                    {date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                  </span>
                  <span className="text-sm font-medium">{date.getUTCDate()}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeDay && (
        <div className="flex flex-col gap-2">
          <Label id="booking-time-label">
            Available times --{" "}
            {new Date(`${activeDay}T00:00:00Z`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </Label>
          <div role="radiogroup" aria-labelledby="booking-time-label" className="flex flex-wrap gap-2">
            {dayTimes.map((slot) => (
              <button
                key={slot.id}
                type="button"
                role="radio"
                aria-checked={slotId === slot.id}
                onClick={() => setSlotId(slot.id)}
                className={cn(
                  "rounded-sm border px-3.5 py-2 text-sm transition-colors",
                  slotId === slot.id
                    ? "border-terracotta bg-terracotta text-white"
                    : "border-border text-charcoal hover:border-charcoal/40"
                )}
              >
                {formatTime(slot.startTime)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error-text">{error}</p>}

      {kids.length === 0 ? (
        // No child on the account yet -- without one there's nothing to book
        // for, so `childId` stays undefined and the button below would just
        // sit permanently disabled with no explanation. Point them at the
        // fix instead of showing a dead control.
        <p className="rounded-sm bg-amber/10 p-3 text-sm text-amber-text">
          Add a child to your account before booking a session.{" "}
          <Link href="/parent/children" className="font-medium underline">
            Add a child
          </Link>
        </p>
      ) : (
        <Button onClick={handleContinue} disabled={!canContinue} size="lg" className="w-full">
          {isPending ? "Holding your slot..." : "Continue to payment →"}
        </Button>
      )}
    </div>
  );
}
