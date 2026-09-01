import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { StatusBadge, type statusBadgeVariants } from "@/components/ui/status-badge";
import type { VariantProps } from "class-variance-authority";
import { CancelBookingButton } from "@/components/shared/cancel-booking-button";
import { JoinSessionButton } from "@/components/booking/join-session-button";
import { getSession } from "@/lib/auth/session";
import { getRealBookingsForParent } from "@/lib/booking/queries";
import { cancelBooking } from "@/lib/booking/actions";
import { formatDateTime } from "@/data/format";

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

  const bookings = await getRealBookingsForParent(session.userId);
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
                  booking.sessionType === "virtual" ? "Virtual" : (booking.location ?? booking.therapistLocation);
                const isUpcoming = booking.slotStartTime && new Date(booking.slotStartTime) > now;
                const canCancel =
                  isUpcoming && (booking.status === "confirmed" || booking.status === "pending_payment");
                const isVirtualConfirmed =
                  booking.sessionType === "virtual" && booking.status === "confirmed" && isUpcoming;
                return (
                  <div key={booking.id} className="flex flex-col gap-2 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal">
                          {booking.childFirstName} with {booking.therapistDisplayName}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {booking.slotStartTime ? formatDateTime(booking.slotStartTime) : "Time not set"} ·{" "}
                          {booking.sessionType.replace("_", " ")} · {format}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-3">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        {canCancel && (
                          <CancelBookingButton
                            bookingId={booking.id}
                            wasPaid={booking.status === "confirmed"}
                            cancelAction={cancelBooking}
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
