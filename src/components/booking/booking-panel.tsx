"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatNaira, formatTime, formatWeekday } from "@/data/format";
import type { AvailabilitySlot, SessionType } from "@/data/types";

export function BookingPanel({
  therapistId,
  pricePerSession,
  sessionTypes,
  slots,
}: {
  therapistId: string;
  pricePerSession: number;
  sessionTypes: SessionType[];
  slots: AvailabilitySlot[];
}) {
  const [selectedType, setSelectedType] = useState<SessionType>(sessionTypes[0]);

  const nextSlots = useMemo(
    () =>
      slots
        .filter((s) => !s.isBooked && s.sessionType === selectedType)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .slice(0, 3),
    [slots, selectedType]
  );

  return (
    <div className="flex flex-col gap-5 rounded-md bg-charcoal p-6 text-offwhite md:sticky md:top-6">
      <div>
        <span className="text-2xl font-medium">{formatNaira(pricePerSession)}</span>
        <span className="ml-1 text-xs text-offwhite/60">per session</span>
      </div>

      {sessionTypes.length > 1 && (
        <div>
          <span className="label-micro mb-2 block text-offwhite/50">Session type</span>
          <div className="flex gap-2">
            {sessionTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={cn(
                  "flex-1 rounded-sm border px-3 py-2 text-sm capitalize transition-colors",
                  selectedType === type
                    ? "border-terracotta text-terracotta"
                    : "border-white/15 text-offwhite/70 hover:border-white/30"
                )}
              >
                {type.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="label-micro mb-2 block text-offwhite/50">Next available</span>
        <div className="flex flex-col gap-1.5">
          {nextSlots.length === 0 && (
            <p className="text-sm text-offwhite/60">No open slots for this session type.</p>
          )}
          {nextSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between rounded-sm bg-white/5 px-3 py-2 text-sm"
            >
              <span>
                {formatWeekday(slot.startTime)}, {formatTime(slot.startTime)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button asChild variant="accent" className="w-full">
        <Link href={`/book/${therapistId}/time`}>Book a session</Link>
      </Button>
    </div>
  );
}
