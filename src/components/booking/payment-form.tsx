"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconLock } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/lib/booking-store";
import { formatDateTime, formatNaira } from "@/data/format";
import { initiateFlutterwavePayment } from "@/lib/payments/actions";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { DiscoveryTherapist } from "@/lib/therapist/discovery";
import type { BookingChild } from "@/components/booking/booking-time-form";
import type { AvailabilitySlot } from "@/data/types";

export function PaymentForm({
  therapist,
  kids,
  slots,
}: {
  therapist: DiscoveryTherapist;
  kids: BookingChild[];
  slots: AvailabilitySlot[];
}) {
  const router = useRouter();
  const { draft, hasHydrated } = useBookingStore();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Plain ref, not just `isPending` -- React's disabled-on-pending state
  // only takes effect after a re-render commits, which two synchronous
  // clicks (a fast double-click, or a scripted `.click(); .click()`) can
  // both slip past. A ref is checked-and-set synchronously on the very
  // first line of the handler, before any of that.
  const hasSubmittedRef = useRef(false);

  const child = kids.find((c) => c.id === draft.childId);
  const slot = slots.find((s) => s.id === draft.slotId);
  const ready = Boolean(draft.childId && draft.slotId && draft.sessionType);

  useEffect(() => {
    // Wait for sessionStorage rehydration before deciding the draft is
    // really missing -- see the hasHydrated comment in booking-store.ts.
    if (hasHydrated && !ready) {
      router.replace(`/book/${therapist.id}/time?resumed=1`);
    }
  }, [hasHydrated, ready, router, therapist.id]);

  const total = therapist.pricePerSession;

  function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setError(null);

    if (!draft.bookingId) {
      setError("Your held slot has expired. Please pick a time again.");
      hasSubmittedRef.current = false;
      return;
    }

    trackEvent(ANALYTICS_EVENTS.bookingStarted, {
      session_type: draft.sessionType ?? undefined,
      amount_naira: total,
    });

    startTransition(async () => {
      const result = await initiateFlutterwavePayment(draft.bookingId!, therapist.id);
      if (!result.ok) {
        setError(result.error);
        hasSubmittedRef.current = false; // allow retrying after a failure
        return;
      }
      window.location.href = result.authorizationUrl;
    });
  }

  if (!hasHydrated || !ready || !child || !slot) {
    return <div className="p-8 text-sm text-muted-foreground">Loading booking details...</div>;
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-3 rounded-sm bg-paper p-4">
        <span className="label-micro text-muted-foreground">Order summary</span>
        <SummaryRow label="Therapist" value={therapist.displayName} />
        <SummaryRow label="Date & time" value={formatDateTime(slot.startTime)} />
        <SummaryRow label="Session type" value={draft.sessionType?.replace("_", " ") ?? ""} capitalize />
        <SummaryRow label="Child" value={child.firstName} />
        <div className="my-1 border-t border-charcoal/10" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-charcoal">Total</span>
          <span className="text-base font-semibold text-charcoal">{formatNaira(total)}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        You&apos;ll be taken to Flutterwave&apos;s secure checkout to pay by card, bank transfer, or USSD.
      </p>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconLock size={13} stroke={1.75} />
        Payments secured by Flutterwave. Hayven never stores your card details.
      </p>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Redirecting to Flutterwave..." : `Pay ${formatNaira(total)} & confirm booking`}
      </Button>
    </form>
  );
}

function SummaryRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-charcoal", capitalize && "capitalize")}>{value}</span>
    </div>
  );
}
