import { notFound, redirect } from "next/navigation";

import { MessageThreadView } from "@/components/messages/message-thread-view";
import { getSession } from "@/lib/auth/session";
import { getBookingById, getMessagesForBooking } from "@/data/queries";

export default async function ParentMessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { threadId } = await params;
  const booking = await getBookingById(threadId);

  // Booking-scoped resource: only the parent on this specific booking may view it.
  if (!booking || booking.parentId !== session.userId) notFound();

  const messages = await getMessagesForBooking(threadId);

  return (
    <MessageThreadView
      bookingId={threadId}
      backHref="/parent/messages"
      currentUserId={session.userId}
      counterpartName={booking.therapist.displayName}
      counterpartRole="Therapist"
      messages={messages}
    />
  );
}
