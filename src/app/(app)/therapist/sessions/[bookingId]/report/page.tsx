import { notFound, redirect } from "next/navigation";

import { SessionReportFlow } from "@/components/session-report/session-report-flow";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getRealProgressGoalsForChild } from "@/lib/session-notes/queries";

export default async function SessionReportPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) notFound();

  const { bookingId } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, parent_id, child_id, therapist_id, children(first_name), availability_slots(start_time)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.therapist_id !== therapist.id) notFound();

  const admin = createAdminClient();
  const [{ data: parentUser }, goals] = await Promise.all([
    admin.from("users").select("full_name").eq("id", booking.parent_id).maybeSingle(),
    getRealProgressGoalsForChild(booking.child_id),
  ]);

  const child = booking.children as unknown as { first_name: string } | null;
  const slot = booking.availability_slots as unknown as { start_time: string } | null;

  return (
    <SessionReportFlow
      bookingId={booking.id}
      childId={booking.child_id}
      childName={child?.first_name ?? "the child"}
      parentName={parentUser?.full_name?.split(" ")[0] ?? "the parent"}
      sessionDateTime={slot?.start_time ?? new Date().toISOString()}
      goals={goals.map((g) => ({ id: g.id, title: g.title }))}
    />
  );
}
