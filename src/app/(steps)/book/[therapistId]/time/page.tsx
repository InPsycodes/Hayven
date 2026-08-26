import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { BookingTimeForm } from "@/components/booking/booking-time-form";
import { getSession } from "@/lib/auth/session";
import { getBookingPageContext } from "@/lib/booking/queries";

export const metadata: Metadata = { title: "Choose a time" };

export default async function BookingTimePage({
  params,
  searchParams,
}: {
  params: Promise<{ therapistId: string }>;
  searchParams: Promise<{ resumed?: string }>;
}) {
  const { therapistId } = await params;
  const { resumed } = await searchParams;
  const session = await getSession();
  if (!session || session.role !== "parent") {
    redirect(`/login?next=/book/${therapistId}/time`);
  }

  const context = await getBookingPageContext(therapistId, session.userId);
  if (!context) notFound();
  const { therapist, slots, kids } = context;

  return (
    <div>
      <StepHeader
        title="Book a session"
        subtitle="Step 1 of 3: Choose a time"
        step={1}
        totalSteps={3}
        closeHref={`/therapists/${therapistId}`}
      />
      {resumed === "1" && (
        // Landed here from payment/confirmation with no in-progress draft --
        // most commonly a booking flow opened fresh in a new tab/window
        // (the draft is tab-scoped sessionStorage, see booking-store.ts) or
        // a hold that's since expired. Say so explicitly rather than
        // silently resetting to step one with no explanation.
        <p className="mx-6 mt-4 rounded-sm bg-amber/10 p-3 text-sm text-amber-text md:mx-8">
          Your booking session couldn&apos;t be found -- it may have expired, or this page was opened in a
          new tab. Please pick a time to start again.
        </p>
      )}
      <BookingTimeForm therapist={therapist} kids={kids} slots={slots} />
    </div>
  );
}
