"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconLock } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useBookingStore, type BookingDraft } from "@/lib/booking-store";
import { formatDateTime, formatNaira } from "@/data/format";
import { initiatePaystackPayment } from "@/lib/payments/actions";
import type { DiscoveryTherapist } from "@/lib/therapist/discovery";
import type { BookingChild } from "@/components/booking/booking-time-form";
import type { AvailabilitySlot } from "@/data/types";

const PAYMENT_METHODS: { value: NonNullable<BookingDraft["paymentMethod"]>; label: string }[] = [
  { value: "card", label: "Debit / credit card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "ussd", label: "USSD" },
];

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
  const { draft, setDraft, hasHydrated } = useBookingStore();
  const [method, setMethod] = useState<BookingDraft["paymentMethod"]>(draft.paymentMethod ?? "card");
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
  const isReal = therapist.source === "real";

  function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setError(null);

    if (!isReal || !draft.bookingId) {
      setDraft({ paymentMethod: method });
      router.push(`/book/${therapist.id}/confirmation`);
      return;
    }

    startTransition(async () => {
      const result = await initiatePaystackPayment(draft.bookingId!, therapist.id);
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

      {isReal ? (
        <p className="text-sm text-muted-foreground">
          You&apos;ll be taken to Paystack&apos;s secure checkout to pay by card, bank transfer, or USSD.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label id="payment-method-label">Payment method</Label>
            <div role="radiogroup" aria-labelledby="payment-method-label" className="flex flex-col gap-2">
              {PAYMENT_METHODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={method === option.value}
                  onClick={() => setMethod(option.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-sm border px-4 py-3 text-left text-sm transition-colors",
                    method === option.value
                      ? "border-terracotta bg-terracotta/5"
                      : "border-border hover:border-charcoal/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border",
                      method === option.value ? "border-terracotta" : "border-border"
                    )}
                  >
                    {method === option.value && <span className="size-2 rounded-full bg-terracotta" />}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {method === "card" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="cardNumber">Card number</Label>
                <Input id="cardNumber" required placeholder="4242 4242 4242 4242" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="expiry">MM/YY</Label>
                <Input id="expiry" required placeholder="08/29" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" required placeholder="123" />
              </div>
            </div>
          )}
        </>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconLock size={13} stroke={1.75} />
        Payments secured via Paystack. Hayven never stores your card details.
      </p>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Redirecting to Paystack..." : `Pay ${formatNaira(total)} & confirm booking`}
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
