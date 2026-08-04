"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ConfirmationPanel } from "@/components/shared/confirmation-panel";
import { Button } from "@/components/ui/button";
import { useBookingStore } from "@/lib/booking-store";
import { formatDateTime, formatNaira } from "@/data/format";
import type { DiscoveryTherapist } from "@/lib/therapist/discovery";
import type { BookingChild } from "@/components/booking/booking-time-form";
import type { AvailabilitySlot } from "@/data/types";

export function BookingConfirmationContent({
  therapist,
  kids,
  slots,
}: {
  therapist: DiscoveryTherapist;
  kids: BookingChild[];
  slots: AvailabilitySlot[];
}) {
  const router = useRouter();
  const { draft } = useBookingStore();
  const child = kids.find((c) => c.id === draft.childId);
  const slot = slots.find((s) => s.id === draft.slotId);

  useEffect(() => {
    if (!draft.slotId || !draft.childId) {
      router.replace(`/book/${therapist.id}/time`);
    }
  }, [draft, router, therapist.id]);

  if (!child || !slot) {
    return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <ConfirmationPanel
      heading={`You're booked with ${therapist.displayName}`}
      subtext="A confirmation has been sent to your email and the session is on your dashboard."
      actions={
        <>
          <Button variant="outline" className="flex-1">
            Add to calendar
          </Button>
          <Button asChild className="flex-1">
            <Link href="/parent">Go to dashboard</Link>
          </Button>
        </>
      }
    >
      <div className="mt-2 flex w-full flex-col gap-2 rounded-sm bg-paper p-4 text-left">
        <Row label="Therapist" value={therapist.displayName} />
        <Row label="Child" value={child.firstName} />
        <Row label="Date & time" value={formatDateTime(slot.startTime)} />
        <Row
          label="Location"
          value={draft.sessionType === "virtual" ? "Virtual (link shared after booking)" : therapist.location}
        />
        <Row label="Amount paid" value={formatNaira(therapist.pricePerSession)} />
      </div>
      <div className="mt-4 w-full rounded-sm bg-terracotta/10 p-4 text-left text-xs text-charcoal">
        Need to reschedule? You can change this booking up to 24 hours before the session from
        your dashboard.
      </div>
    </ConfirmationPanel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-charcoal">{value}</span>
    </div>
  );
}