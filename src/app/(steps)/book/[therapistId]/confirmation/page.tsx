import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { BookingConfirmationContent } from "@/components/booking/booking-confirmation-content";
import { getSession } from "@/lib/auth/session";
import { getBookingPageContext, getRealBookingStatus } from "@/lib/booking/queries";
import { finalizeFromReference } from "@/lib/payments/actions";

export const metadata: Metadata = { title: "Booking confirmed" };

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ therapistId: string }>;
  searchParams: Promise<{ reference?: string; bookingId?: string }>;
}) {
  const { therapistId } = await params;
  const session = await getSession();
  if (!session || session.role !== "parent") {
    redirect(`/login?next=/book/${therapistId}/confirmation`);
  }

  const { reference, bookingId } = await searchParams;
  if (reference) {
    // Best-effort immediate confirmation; the webhook is the reliable
    // backstop if this call or the redirect itself doesn't land.
    await finalizeFromReference(reference);
  }

  // Re-check the real booking status rather than trusting optimistic client
  // state -- if neither this call nor the webhook has landed yet, say so
  // instead of showing a false "you're booked" before it's actually true.
  // E2, external PRD review: a cancelled status here used to fall through to
  // the same "you're booked" branch as confirmed (the code only ever checked
  // for pending_payment) -- shown whenever the 15-minute hold expired before
  // payment could be confirmed, parent charged or not.
  const realStatus = bookingId ? await getRealBookingStatus(bookingId) : null;
  const stillPending = realStatus?.status === "pending_payment";
  const holdExpired = realStatus?.status === "cancelled";

  const context = await getBookingPageContext(therapistId, session.userId);
  if (!context) notFound();
  const { therapist, slots, kids } = context;

  return (
    <div>
      <StepHeader
        title="Book a session"
        subtitle="Step 3 of 3: Confirmed"
        step={3}
        totalSteps={3}
        closeHref="/parent"
      />
      <BookingConfirmationContent
        therapist={therapist}
        kids={kids}
        slots={slots}
        pending={stillPending}
        holdExpired={holdExpired}
        wasPaid={realStatus?.hasSuccessfulPayment ?? false}
      />
    </div>
  );
}