import { NextRequest, NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/payments/paystack";
import { finalizeBookingPayment } from "@/lib/booking/actions";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const bookingId = event.data?.metadata?.booking_id;
    const reference = event.data?.reference;
    const amountKobo = event.data?.amount;
    if (typeof bookingId === "string" && typeof reference === "string" && typeof amountKobo === "number") {
      await finalizeBookingPayment(bookingId, reference, amountKobo);
    }
  }

  return NextResponse.json({ received: true });
}
