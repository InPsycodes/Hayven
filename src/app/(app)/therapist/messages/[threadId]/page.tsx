import { notFound, redirect } from "next/navigation";

import { MessageThreadView } from "@/components/messages/message-thread-view";
import { getSession } from "@/lib/auth/session";
import { getBookingById, getMessagesForBooking, getUserById } from "@/data/queries";

export default async function TherapistMessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { threadId } = await params;
  const booking = await getBookingById(threadId);

  // Booking-scoped resource: only the assigned therapist on this specific booking may view it.
  if (!booking || booking.therapist.userId !== session.userId) notFound();

  const [messages, parent] = await Promise.all([
    getMessagesForBooking(threadId),
    getUserById(booking.parentId),
  ]);

  return (
    <MessageThreadView
      bookingId={threadId}
      backHref="/therapist/messages"
      currentUserId={session.userId}
      counterpartName={parent?.fullName ?? "Parent"}
      counterpartRole="Parent"
      messages={messages}
    />
  );
}
