import { notFound, redirect } from "next/navigation";

import { SessionReportFlow } from "@/components/session-report/session-report-flow";
import { getSession } from "@/lib/auth/session";
import { getBookingById, getProgressGoalsForChild, getUserById } from "@/data/queries";

export default async function SessionReportPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { bookingId } = await params;
  const booking = await getBookingById(bookingId);

  if (!booking || booking.therapist.userId !== session.userId) notFound();

  const [goals, parent] = await Promise.all([
    getProgressGoalsForChild(booking.childId),
    getUserById(booking.parentId),
  ]);

  return (
    <SessionReportFlow
      bookingId={booking.id}
      therapistId={booking.therapist.id}
      childName={booking.child.firstName}
      parentName={parent?.fullName.split(" ")[0] ?? "the parent"}
      sessionDateTime={booking.slot.startTime}
      goals={goals.map((g) => ({ id: g.id, title: g.title }))}
    />
  );
}
