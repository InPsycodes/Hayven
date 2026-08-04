import { redirect } from "next/navigation";
import { IconMessage, IconNotes } from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ScheduleItem } from "@/components/dashboard/schedule-item";
import { NeedsAttentionItem } from "@/components/dashboard/needs-attention-item";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { formatNaira } from "@/data/format";
import {
  getRealActiveClientCountForTherapist,
  getRealEarningsForTherapist,
  getRealReportsDueForTherapist,
  getRealTodaysBookingsForTherapist,
} from "@/lib/booking/queries";
import { getRealMessageThreadsForTherapist } from "@/lib/messages/queries";

export default async function TherapistDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const today = new Date();
  const todayISODate = today.toISOString().slice(0, 10);

  const [todaysBookings, activeClients, reportsDue, earnings, threads] = await Promise.all([
    getRealTodaysBookingsForTherapist(therapist.id, todayISODate),
    getRealActiveClientCountForTherapist(therapist.id),
    getRealReportsDueForTherapist(therapist.id),
    getRealEarningsForTherapist(session.userId),
    getRealMessageThreadsForTherapist(therapist.id),
  ]);

  // No read-tracking column in the schema -- "awaiting reply" (last message
  // wasn't from this therapist) is the closest honest proxy for "unread."
  const awaitingReplyThreads = threads.filter(
    (t) => t.lastMessage !== null && t.lastMessageSenderId !== session.userId
  );
  const nextSessionId = todaysBookings[0]?.id;

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting={`Good morning, ${session.name.replace("Dr. ", "Dr. ")}`}
        subtext={`${today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${todaysBookings.length} session${todaysBookings.length === 1 ? "" : "s"} today`}
      />

      <div className="flex flex-col gap-8 px-5 py-6 md:px-10 md:py-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Active clients" value={String(activeClients)} />
          <StatCard label="Today's sessions" value={String(todaysBookings.length)} />
          <StatCard
            label="Reports due"
            value={String(reportsDue.length)}
            urgent={reportsDue.length > 0}
          />
          <StatCard label="This month's earnings" value={formatNaira(earnings)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-3">
            <h2 className="label-micro text-muted-foreground">Today&apos;s schedule</h2>
            {todaysBookings.length === 0 ? (
              <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground">
                No sessions scheduled today.
              </p>
            ) : (
              todaysBookings.map((booking) => (
                <ScheduleItem
                  key={booking.id}
                  clientName={booking.childFirstName}
                  sessionType={booking.sessionType.replace("_", " ")}
                  format={booking.sessionType === "virtual" ? "Google Meet" : (booking.location ?? "In-person")}
                  startTime={booking.slotStartTime}
                  isNext={booking.id === nextSessionId}
                />
              ))
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="label-micro text-muted-foreground">Needs attention</h2>
            {reportsDue.length === 0 && awaitingReplyThreads.length === 0 ? (
              <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            ) : (
              <>
                {reportsDue.map((booking) => (
                  <NeedsAttentionItem
                    key={booking.id}
                    icon={IconNotes}
                    title={`Session report overdue: ${booking.childFirstName}`}
                    subtitle={`Session on ${new Date(booking.slotStartTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })} still needs notes`}
                    href={`/therapist/sessions/${booking.id}/report`}
                  />
                ))}
                {awaitingReplyThreads.map((thread) => (
                  <NeedsAttentionItem
                    key={thread.bookingId}
                    icon={IconMessage}
                    title={`New message from ${thread.counterpartName}`}
                    subtitle={thread.lastMessage ?? ""}
                    href={`/therapist/messages/${thread.bookingId}`}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
