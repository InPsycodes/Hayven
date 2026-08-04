import { notFound, redirect } from "next/navigation";

import { MessageThreadView } from "@/components/messages/message-thread-view";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getRealMessagesForBooking } from "@/lib/messages/queries";

export default async function TherapistMessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) notFound();

  const { threadId } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, parent_id, therapist_id")
    .eq("id", threadId)
    .maybeSingle();

  // Booking-scoped resource: only the assigned therapist on this specific booking may view it.
  if (!booking || booking.therapist_id !== therapist.id) notFound();

  const admin = createAdminClient();
  const [{ data: parentUser }, messages] = await Promise.all([
    admin.from("users").select("full_name").eq("id", booking.parent_id).maybeSingle(),
    getRealMessagesForBooking(threadId),
  ]);

  return (
    <MessageThreadView
      bookingId={threadId}
      backHref="/therapist/messages"
      currentUserId={session.userId}
      counterpartName={parentUser?.full_name ?? "Parent"}
      counterpartRole="Parent"
      messages={messages}
    />
  );
}
