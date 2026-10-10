import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import type { VariantProps } from "class-variance-authority";
import { CancelBookingButton } from "@/components/shared/cancel-booking-button";
import { RescheduleBookingButton } from "@/components/booking/reschedule-booking-button";
import { JoinSessionButton } from "@/components/booking/join-session-button";
import { ReportProblemButton } from "@/components/booking/report-problem-button";
import { getSession } from "@/lib/auth/session";
import { getRealBookingsForParent, getBookingFinancials } from "@/lib/booking/queries";
import { getMyDisputesByBooking } from "@/lib/disputes/queries";
import { cancelBooking } from "@/lib/booking/actions";
import { formatDateTime, shortName } from "@/data/format";

const DISPUTABLE = new Set(["completed", "no_show", "cancelled"]);
const DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type Tone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

const STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  confirmed: { label: "Confirmed", tone: "sage" },
  pending_payment: { label: "Awaiting payment", tone: "amber" },
  completed: { label: "Completed", tone: "grey" },
  cancelled: { label: "Cancelled", tone: "error" },
  no_show: { label: "No-show", tone: "grey" },
};

export default async function ParentSessionsPage() {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/login");

  // A checkout the parent never paid for ends up cancelled with its hold
  // expiry still set (confirmation always clears it). It was never a session,
  // so leave it out rather than listing it as a cancelled one.
  const bookings = (await getRealBookingsForParent(session.userId)).filter(
    (b) => !(b.status === "cancelled" && b.expiresAt)
  );
  const financials = await getBookingFinancials(bookings.map((b) => b.id));
  const disputes = await getMyDisputesByBooking(
    bookings.filter((b) => DISPUTABLE.has(b.status)).map((b) => b.id)
  );
  const now = new Date();

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Sessions"
        subtext={`${bookings.length} session${bookings.length === 1 ? "" : "s"} booked`}
      />
      <div className="px-5 py-6 md:px-10 md:py-8">
        {bookings.length === 0 ? (
          <p className="rounded-sm bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
            No sessions booked yet.{" "}
            <Link href="/search" className="font-medium text-terracotta hover:underline">
              Find a therapist
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {bookings.map((booking) => {
                const status = STATUS_LABEL[booking.status] ?? { label: booking.status, tone: "grey" as const };
                const format =
                  booking.sessionType === "virtual"
                    ? "Virtual"
                    : ["In person", booking.location ?? booking.therapistLocation].filter(Boolean).join(" · ");
                const isUpcoming = booking.slotStartTime && new Date(booking.slotStartTime) > now;
                const canCancel =
                  isUpcoming && (booking.status === "confirmed" || booking.status === "pending_payment");
                const canReschedule =
                  booking.status === "confirmed" &&
                  booking.slotStartTime &&
                  new Date(booking.slotStartTime).getTime() - now.getTime() > 24 * 60 * 60 * 1000;
                const isVirtualConfirmed =
                  booking.sessionType === "virtual" && booking.status === "confirmed" && isUpcoming;
                const dispute = disputes.get(booking.id) ?? null;
                const showReport =
                  DISPUTABLE.has(booking.status) &&
                  (dispute !== null ||
                    (!!booking.slotEndTime &&
                      now.getTime() - new Date(booking.slotEndTime).getTime() < DISPUTE_WINDOW_MS));
                return (
                  <div key={booking.id} className="flex flex-col gap-2 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal">
                          {booking.childFirstName} with {booking.therapistDisplayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.slotStartTime ? formatDateTime(booking.slotStartTime) : "Time not set"} · {format}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-3">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        {booking.status === "completed" && (
                          <Link
                            href={`/therapists/${booking.therapistId}#reviews`}
                            className="text-xs font-medium text-terracotta hover:underline"
                          >
                            Review {shortName(booking.therapistDisplayName)}
                          </Link>
                        )}
                        {canReschedule && <RescheduleBookingButton bookingId={booking.id} />}
                        {canCancel && (
                          <CancelBookingButton
                            bookingId={booking.id}
                            wasPaid={booking.status === "confirmed"}
                            cancelAction={cancelBooking}
                            paidAmount={financials.get(booking.id)?.paidAmount ?? null}
                            slotStartTime={booking.slotStartTime}
                          />
                        )}
                      </div>
                    </div>
                    {isVirtualConfirmed &&
                      (booking.meetingLink ? (
                        <JoinSessionButton meetingLink={booking.meetingLink} startTime={booking.slotStartTime} />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Your therapist will share the video link here before the session.
                        </p>
                      ))}
                    {showReport && <ReportProblemButton bookingId={booking.id} dispute={dispute} />}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
