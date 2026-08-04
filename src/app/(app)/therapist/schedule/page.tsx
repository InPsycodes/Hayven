import Link from "next/link";
import { redirect } from "next/navigation";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { WeekScheduleGrid } from "@/components/therapist/week-schedule-grid";
import { AddAvailabilityForm } from "@/components/therapist/add-availability-form";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId, getRealAvailabilityForTherapist } from "@/lib/therapist/queries";
import { getRealBookingsForTherapist } from "@/lib/booking/queries";

function mondayOfWeek(offsetWeeks: number): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
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
  const weekStart = mondayOfWeek(offsetWeeks);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const [realSlots, realBookings] = await Promise.all([
    getRealAvailabilityForTherapist(therapist.id, {
      from: `${weekStart.toISOString().slice(0, 10)}T00:00:00Z`,
      to: `${weekEnd.toISOString().slice(0, 10)}T23:59:59Z`,
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

  const weekRangeLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;

  return (
    <div>
      <DashboardHeader session={session} greeting="Schedule" subtext={weekRangeLabel} />

      <div className="flex flex-col gap-5 px-5 py-6 md:px-10 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-sm border border-border">
              <span className="bg-charcoal px-3 py-1.5 text-xs font-medium text-offwhite">Week</span>
              <span className="px-3 py-1.5 text-xs text-muted-foreground">Month</span>
            </div>
            <Link
              href={`/therapist/schedule?offset=${offsetWeeks - 1}`}
              className="flex size-7 items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-charcoal"
            >
              <IconChevronLeft size={16} />
            </Link>
            <Link
              href={`/therapist/schedule?offset=${offsetWeeks + 1}`}
              className="flex size-7 items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-charcoal"
            >
              <IconChevronRight size={16} />
            </Link>
          </div>
          <AddAvailabilityForm />
        </div>

        <WeekScheduleGrid weekStart={weekStart} slots={slots} bookings={bookings} />
      </div>
    </div>
  );
}
