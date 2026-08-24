import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StepHeader } from "@/components/shared/step-header";
import { PaymentForm } from "@/components/booking/payment-form";
import { getSession } from "@/lib/auth/session";
import { getBookingPageContext } from "@/lib/booking/queries";

export const metadata: Metadata = { title: "Payment" };

export default async function BookingPaymentPage({
  params,
}: {
  params: Promise<{ therapistId: string }>;
}) {
  const { therapistId } = await params;
  const session = await getSession();
  if (!session || session.role !== "parent") {
    redirect(`/login?next=/book/${therapistId}/payment`);
  }

  const context = await getBookingPageContext(therapistId, session.userId);
  if (!context) notFound();
  const { therapist, slots, kids } = context;

  return (
    <div>
      <StepHeader
        title="Book a session"
        subtitle="Step 2 of 3: Payment"
        step={2}
        totalSteps={3}
        closeHref={`/therapists/${therapistId}`}
      />
      <PaymentForm therapist={therapist} kids={kids} slots={slots} />
    </div>
  );
}
