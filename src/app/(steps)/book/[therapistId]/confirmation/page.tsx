import { notFound, redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { BookingConfirmationContent } from "@/components/booking/booking-confirmation-content";
import { getSession } from "@/lib/auth/session";
import { getBookingPageContext } from "@/lib/booking/queries";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ therapistId: string }>;
}) {
  const { therapistId } = await params;
  const session = await getSession();
  if (!session || session.role !== "parent") {
    redirect(`/login?next=/book/${therapistId}/confirmation`);
  }

  const context = await getBookingPageContext(therapistId, session.userId);
  if (!context) notFound();
  const { therapist, slots, kids } = context;

  return (
    <div>
      <StepHeader
        title="Book a session"
        subtitle="Step 3 of 3 -- Confirmed"
        step={3}
        totalSteps={3}
      />
      <BookingConfirmationContent therapist={therapist} kids={kids} slots={slots} />
    </div>
  );
}