import Link from "next/link";
import { redirect } from "next/navigation";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { VariantProps } from "class-variance-authority";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import { WeekScheduleGrid } from "@/components/therapist/week-schedule-grid";
import { AddAvailabilityForm } from "@/components/therapist/add-availability-form";
import { CancelBookingButton } from "@/components/shared/cancel-booking-button";
import { MeetingLinkField } from "@/components/booking/meeting-link-field";
import { MarkNoShowButton } from "@/components/booking/mark-no-show-button";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId, getRealAvailabilityForTherapist } from "@/lib/therapist/queries";
import { getRealBookingsForTherapist, getNoShowNotes, getBookingFinancials } from "@/lib/booking/queries";
import { cancelBookingAsTherapist } from "@/lib/booking/actions";
import { formatDateTime, toLagosWallClock, fromLagosWallClock } from "@/data/format";

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  confirmed: { label: "Confirmed", tone: "sage" },
  pending_payment: { label: "Awaiting payment", tone: "amber" },
};

/** Returns a Lagos wall-clock proxy Date (see toLagosWallClock) for the Monday of the given week offset, so "this week" is determined by the Lagos calendar day, not the server/UTC one. */
function mondayOfWeek(offsetWeeks: number): Date {
  const nowLagos = toLagosWallClock(new Date());
  const day = nowLagos.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(nowLagos.getUTCFullYear(), nowLagos.getUTCMonth(), nowLagos.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - diffToMonday + offsetWeeks * 7);
  return monday;
}

interface SchedulePageProps {
  searchParams: Promise<{ offset?: string }>;
}

export default async function TherapistSchedulePage({ searchParams }: SchedulePageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const { offset } = await searchParams;
  const offsetWeeks = Number(offset ?? 0) || 0;
  // weekStart/weekEnd are Lagos wall-clock proxies (see toLagosWallClock) --
  // convert to true UTC instants before querying stored timestamptz data.
  const weekStart = mondayOfWeek(offsetWeeks);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndOfDay = new Date(weekEnd);
  weekEndOfDay.setUTCHours(23, 59, 59, 999);

  const [realSlots, realBookings] = await Promise.all([
    getRealAvailabilityForTherapist(therapist.id, {
      from: fromLagosWallClock(weekStart).toISOString(),
      to: fromLagosWallClock(weekEndOfDay).toISOString(),
    }),
    getRealBookingsForTherapist(therapist.id),
  ]);

  const slots = realSlots.map((slot) => ({
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isBooked: slot.isBooked,
    sessionType: slot.sessionType,
  }));

  const bookings = realBookings
    .filter((booking) => booking.status !== "cancelled")
    .map((booking) => ({
      id: booking.id,
      availabilitySlotId: booking.availabilitySlotId,
      status: booking.status,
      startTime: booking.slotStartTime,
      childFirstName: booking.childFirstName,
    }));

  const now = new Date();
  const upcomingBookings = realBookings
    .filter(
      (booking) =>
        (booking.status === "confirmed" || booking.status === "pending_payment") &&
        booking.slotStartTime &&
        new Date(booking.slotStartTime) > now
    )
    .sort((a, b) => new Date(a.slotStartTime).getTime() - new Date(b.slotStartTime).getTime());

  const RECENT_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;
  const recentlyFinished = realBookings
    .filter(
      (booking) =>
        booking.slotEndTime &&
        ["completed", "confirmed", "no_show"].includes(booking.status) &&
        new Date(booking.slotEndTime).getTime() <= now.getTime() &&
        new Date(booking.slotEndTime).getTime() > now.getTime() - RECENT_WINDOW_MS
    )
    .sort((a, b) => new Date(b.slotEndTime).getTime() - new Date(a.slotEndTime).getTime());

  const noShowNotes = await getNoShowNotes(
    recentlyFinished.filter((b) => b.status === "no_show").map((b) => b.id)
  );
  const financials = await getBookingFinancials(upcomingBookings.map((b) => b.id));

  const weekRangeLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;

  return (
    <div>
      <DashboardHeader session={session} greeting="Schedule" subtext={weekRangeLabel} />

      <div className="flex flex-col gap-5 px-5 py-6 md:px-10 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-sm border border-border">
              <span className="bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Week</span>
              <span className="px-3 py-1.5 text-xs text-muted-foreground">Month</span>
            </div>
            <Link
              href={`/therapist/schedule?offset=${offsetWeeks - 1}`}
              aria-label="Previous week"
              className="flex size-10 items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-charcoal"
            >
              <IconChevronLeft size={16} />
            </Link>
            <Link
              href={`/therapist/schedule?offset=${offsetWeeks + 1}`}
              aria-label="Next week"
              className="flex size-10 items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-charcoal"
            >
              <IconChevronRight size={16} />
            </Link>
          </div>
          <AddAvailabilityForm />
        </div>

        <Card lift className="p-5">
          <WeekScheduleGrid weekStart={weekStart} slots={slots} bookings={bookings} />
        </Card>

        {upcomingBookings.length > 0 && (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {upcomingBookings.map((booking) => {
                const status = STATUS_LABEL[booking.status] ?? { label: booking.status, tone: "grey" as const };
                return (
                  <div key={booking.id} className="flex flex-col gap-2 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal">{booking.childFirstName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {formatDateTime(booking.slotStartTime)} · {booking.sessionType.replace("_", " ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-3">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        <CancelBookingButton
                          bookingId={booking.id}
                          wasPaid={booking.status === "confirmed"}
                          cancelAction={cancelBookingAsTherapist}
                          initiatedBy="therapist"
                          paidAmount={financials.get(booking.id)?.paidAmount ?? null}
                          slotStartTime={booking.slotStartTime}
                        />
                      </div>
                    </div>
                    {booking.sessionType === "virtual" && booking.status === "confirmed" && (
                      <MeetingLinkField
                        bookingId={booking.id}
                        startTime={booking.slotStartTime}
                        initialLink={booking.meetingLink}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {recentlyFinished.length > 0 && (
          <Card lift className="p-2">
            <p className="px-3 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Recently finished
            </p>
            <div className="flex flex-col divide-y divide-border">
              {recentlyFinished.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal">{booking.childFirstName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {formatDateTime(booking.slotStartTime)} · {booking.sessionType.replace("_", " ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {booking.status !== "no_show" && (
                      <Link
                        href={`/therapist/children/${booking.childId}/sessions/new`}
                        className="text-xs font-medium text-terracotta hover:underline"
                      >
                        Log session
                      </Link>
                    )}
                    <MarkNoShowButton
                      bookingId={booking.id}
                      isNoShow={booking.status === "no_show"}
                      note={noShowNotes.get(booking.id) ?? null}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
