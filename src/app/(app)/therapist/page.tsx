import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconUsers,
  IconCalendarEvent,
  IconFileText,
  IconWallet,
  IconShieldCheck,
} from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PanelCard } from "@/components/dashboard/panel-card";
import { ScheduleItem } from "@/components/dashboard/schedule-item";
import { NeedsAttentionItem } from "@/components/dashboard/needs-attention-item";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { VerificationStatusBanner } from "@/components/therapist/verification-status-banner";
import { Reveal } from "@/components/marketing/reveal";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { formatNaira, formatDate, LAGOS_TZ } from "@/data/format";
import {
  getRealActiveClientCountForTherapist,
  getRealEarningsForTherapist,
  getRealTodaysBookingsForTherapist,
} from "@/lib/booking/queries";
import { getReportWorkflowSummary } from "@/lib/reports/queries";
import { getRealMessageThreadsForTherapist } from "@/lib/messages/queries";

export default async function TherapistDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const today = new Date();

  const [todaysBookings, activeClients, reportSummary, earnings, threads] = await Promise.all([
    getRealTodaysBookingsForTherapist(therapist.id),
    getRealActiveClientCountForTherapist(therapist.id),
    getReportWorkflowSummary(therapist.id),
    getRealEarningsForTherapist(session.userId),
    getRealMessageThreadsForTherapist(therapist.id),
  ]);

  // No read-tracking column -- "awaiting reply" (last message wasn't from
  // this therapist) is the closest honest proxy for "unread."
  const awaitingReplyThreads = threads.filter(
    (t) => t.lastMessage !== null && t.lastMessageSenderId !== session.userId
  );
  const nextSessionId = todaysBookings[0]?.id;
  const caughtUp = reportSummary.needsReportCount === 0 && awaitingReplyThreads.length === 0;

  return (
    <div className="min-h-full bg-gradient-to-b from-terracotta/[0.09] via-background to-background">
      <DashboardHeader
        session={session}
        eyebrow="Welcome back,"
        greeting={session.name}
        subtext={`${today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: LAGOS_TZ })} · ${todaysBookings.length} session${todaysBookings.length === 1 ? "" : "s"} today`}
      />

      <div className="flex flex-col gap-4 px-5 pt-2 md:px-10">
        <VerificationStatusBanner status={therapist.verificationStatus} />

        {session.isSupervisor && (
          <Link
            href="/supervisor"
            className="group/sup flex items-center gap-3 rounded-xl bg-success/10 p-4 ring-1 ring-success/15 transition-colors hover:bg-success/15"
          >
            <IconShieldCheck size={20} stroke={1.75} className="shrink-0 text-success-text" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-success-text">You have supervisor access</p>
              <p className="mt-0.5 text-sm text-success-text/80">
                Oversee the therapists assigned to you from the Supervisor portal.
              </p>
            </div>
            <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-success-text sm:inline-flex">
              Supervisor portal
              <IconArrowRight size={13} stroke={2.25} className="transition-transform group-hover/sup:translate-x-0.5" />
            </span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 py-6 md:grid-cols-12 md:px-10 md:py-6">
        {/* Stat tiles */}
        <div className="grid min-w-0 grid-cols-2 gap-4 md:contents">
        <Reveal delayMs={0} className="min-w-0 md:col-span-3">
          <StatTile
            icon={IconUsers}
            tone="accent"
            value={String(activeClients)}
            label={activeClients === 1 ? "Active client" : "Active clients"}
            href="/therapist/caseload"
            dest="Caseload"
          />
        </Reveal>
        <Reveal delayMs={60} className="min-w-0 md:col-span-3">
          <StatTile
            icon={IconCalendarEvent}
            tone="sage"
            value={String(todaysBookings.length)}
            label={todaysBookings.length === 1 ? "Session today" : "Sessions today"}
            href="/therapist/schedule"
            dest="Schedule"
          />
        </Reveal>
        <Reveal delayMs={120} className="min-w-0 md:col-span-3">
          <StatTile
            icon={IconFileText}
            tone={reportSummary.needsReportCount > 0 ? "amber" : "ink"}
            value={String(reportSummary.needsReportCount)}
            label={reportSummary.needsReportCount === 1 ? "Report due" : "Reports due"}
            href="/therapist/schedule"
            dest="Write reports"
            pill={reportSummary.needsReportCount > 0 ? { tone: "due", text: "ACTION" } : undefined}
          />
        </Reveal>
        <Reveal delayMs={180} className="min-w-0 md:col-span-3">
          <StatTile
            icon={IconWallet}
            tone="ink"
            value={formatNaira(earnings)}
            label="Earned this month"
            href="/therapist/earnings"
            dest="Earnings & payouts"
          />
        </Reveal>
        </div>

        {/* Today's schedule */}
        <Reveal delayMs={240} className="min-w-0 md:col-span-7">
          <PanelCard.Static
            label="Today's schedule"
            className="h-full"
            footer={{ href: "/therapist/schedule", dest: "Full schedule" }}
          >
            {todaysBookings.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No sessions scheduled today.</p>
            ) : (
              <div className="mt-1 flex flex-col divide-y divide-border">
                {todaysBookings.map((booking) => (
                  <ScheduleItem
                    key={booking.id}
                    clientName={booking.childFirstName}
                    sessionType={booking.sessionType.replace("_", " ")}
                    format={
                      booking.sessionType === "virtual"
                        ? "Google Meet"
                        : booking.location ?? "In-person"
                    }
                    startTime={booking.slotStartTime}
                    isNext={booking.id === nextSessionId}
                  />
                ))}
              </div>
            )}
          </PanelCard.Static>
        </Reveal>

        {/* Needs attention */}
        <Reveal delayMs={300} className="min-w-0 md:col-span-5">
          <PanelCard.Static label="Needs attention" className="h-full">
            {caughtUp ? (
              <p className="py-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              <div className="mt-1 flex flex-col divide-y divide-border">
                {reportSummary.needsReportSessions.map((s) => (
                  <NeedsAttentionItem
                    key={s.id}
                    tone="amber"
                    title={`Report needed: ${s.childFirstName}`}
                    subtitle={`Session on ${formatDate(s.sessionDate)} still needs a report`}
                    href={`/therapist/children/${s.childId}/sessions/${s.id}`}
                  />
                ))}
                {awaitingReplyThreads.map((thread) => (
                  <NeedsAttentionItem
                    key={thread.bookingId}
                    tone="rust"
                    title={`New message from ${thread.counterpartName}`}
                    subtitle={thread.lastMessage ?? ""}
                    href={`/therapist/messages/${thread.bookingId}`}
                  />
                ))}
              </div>
            )}
          </PanelCard.Static>
        </Reveal>

        {/* Messages */}
        <Reveal delayMs={360} className="min-w-0 md:col-span-7">
          <PanelCard.Static
            label="Messages awaiting reply"
            className="h-full"
            footer={{ href: "/therapist/messages", dest: "All messages" }}
          >
            <div className="mt-3 flex flex-col">
              {awaitingReplyThreads.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Nothing waiting on you.</p>
              ) : (
                awaitingReplyThreads.slice(0, 3).map((thread) => (
                  <Link
                    key={thread.bookingId}
                    href={`/therapist/messages/${thread.bookingId}`}
                    className="flex items-center gap-3 border-t border-border/60 py-2.5 first:border-t-0 hover:opacity-80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal">{thread.counterpartName}</p>
                      <p className="truncate text-xs text-muted-foreground">{thread.lastMessage}</p>
                    </div>
                    <IconArrowRight size={14} stroke={1.75} className="shrink-0 text-muted-foreground" />
                  </Link>
                ))
              )}
            </div>
          </PanelCard.Static>
        </Reveal>

        {/* Report status */}
        <Reveal delayMs={420} className="min-w-0 md:col-span-5">
          <PanelCard href="/therapist/schedule" label="Report status" dest="Manage reports" className="h-full">
            <div className="mt-3 flex flex-col gap-2">
              {[
                { label: "Need reports", value: reportSummary.needsReportCount, dot: "bg-terracotta" },
                { label: "Draft", value: reportSummary.draftCount, dot: "bg-amber" },
                { label: "Published", value: reportSummary.publishedCount, dot: "bg-success" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-charcoal">
                    <span className={`size-1.5 rounded-full ${row.dot}`} />
                    {row.label}
                  </span>
                  <span className="font-medium text-charcoal">{row.value}</span>
                </div>
              ))}
            </div>
          </PanelCard>
        </Reveal>
      </div>
    </div>
  );
}
