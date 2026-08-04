import { notFound, redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { BookingTimeForm } from "@/components/booking/booking-time-form";
import { getSession } from "@/lib/auth/session";
import { getBookingPageContext } from "@/lib/booking/queries";

export default async function BookingTimePage({
  params,
}: {
  params: Promise<{ therapistId: string }>;
}) {
  const { therapistId } = await params;
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
        subtitle="Step 1 of 3 -- Choose a time"
        step={1}
        totalSteps={3}
        closeHref={`/therapists/${therapistId}`}
      />
      <BookingTimeForm therapist={therapist} kids={kids} slots={slots} />
    </div>
  );
}
