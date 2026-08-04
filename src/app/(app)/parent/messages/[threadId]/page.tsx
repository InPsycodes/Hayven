import { notFound, redirect } from "next/navigation";

import { MessageThreadView } from "@/components/messages/message-thread-view";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRealMessagesForBooking } from "@/lib/messages/queries";

export default async function ParentMessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { threadId } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, parent_id, therapist_id")
    .eq("id", threadId)
    .maybeSingle();

  // Booking-scoped resource: only the parent on this specific booking may view it.
  if (!booking || booking.parent_id !== session.userId) notFound();

  const [{ data: therapistPublic }, messages] = await Promise.all([
    supabase.from("therapist_public_profiles").select("display_name").eq("id", booking.therapist_id).maybeSingle(),
    getRealMessagesForBooking(threadId),
  ]);

  return (
    <MessageThreadView
      bookingId={threadId}
      backHref="/parent/messages"
      currentUserId={session.userId}
      counterpartName={therapistPublic?.display_name ?? "Therapist"}
      counterpartRole="Therapist"
      messages={messages}
    />
  );
}
