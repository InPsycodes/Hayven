import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconUsers,
  IconCalendarEvent,
  IconFileText,
  IconWallet,
  IconShieldCheck,
  IconAlertTriangle,
  IconVideo,
  IconMapPin,
  IconClock,
  IconMessage,
} from "@tabler/icons-react";

import { CareShell } from "@/components/care/care-shell";
import { CareHeader } from "@/components/care/care-header";
import { CareStat } from "@/components/care/care-stat";
import { CarePanel } from "@/components/care/care-panel";
import { CareAreaChart } from "@/components/care/care-area-chart";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { OnboardingChecklist } from "@/components/therapist/onboarding-checklist";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getOnboardingStatus } from "@/lib/therapist/onboarding";
import { formatNaira, formatDate, formatTime, formatRelativeToNow, greetingForNow, initialsFromName, shortName, LAGOS_TZ } from "@/data/format";
import {
  getRealActiveClientCountForTherapist,
  getRealEarningsForTherapist,
  getRealTodaysBookingsForTherapist,
} from "@/lib/booking/queries";
import { getReportWorkflowSummary } from "@/lib/reports/queries";
import { getRealMessageThreadsForTherapist } from "@/lib/messages/queries";
import { getTherapistMonthlySeries } from "@/lib/dashboard/care";

export default async function TherapistDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const today = new Date();

  const [todaysBookings, activeClients, reportSummary, earnings, threads, series, onboarding] = await Promise.all([
    getRealTodaysBookingsForTherapist(therapist.id),
    getRealActiveClientCountForTherapist(therapist.id),
    getReportWorkflowSummary(therapist.id),
    getRealEarningsForTherapist(session.userId),
    getRealMessageThreadsForTherapist(therapist.id),
    getTherapistMonthlySeries(session.userId, therapist.id, 6),
    getOnboardingStatus(therapist.id),
  ]);

  const awaitingReplyThreads = threads.filter(
    (t) => t.lastMessage !== null && t.lastMessageSenderId !== session.userId
  );
  const nextBooking = todaysBookings[0];
  const caughtUp = reportSummary.needsReportCount === 0 && awaitingReplyThreads.length === 0;

  const prevEarnings = series.length >= 2 ? series[series.length - 2].earnings : 0;
  const earningsDelta =
    prevEarnings > 0 ? Math.round(((earnings - prevEarnings) / prevEarnings) * 100) : null;

  const verificationBanner =
    therapist.verificationStatus === "rejected"
      ? { tone: "error" as const, text: "Your verification wasn't approved. See your profile for details." }
      : therapist.verificationStatus === "pending" || therapist.verificationStatus === "flagged"
        ? {
            tone: "amber" as const,
            text:
              therapist.verificationStatus === "flagged"
                ? "We need more information on your application. Check your profile."
                : "Verification pending. Your credentials are being reviewed (2–5 business days).",
          }
        : null;

  return (
    <CareShell>
      <CareHeader
        session={session}
        initials={initialsFromName(session.name)}
        title={`${greetingForNow()}, ${shortName(session.name)}`}
        status={
          reportSummary.needsReportCount > 0
            ? { label: `${reportSummary.needsReportCount} report${reportSummary.needsReportCount === 1 ? "" : "s"} due`, tone: "warn" }
            : undefined
        }
        meta={`${today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: LAGOS_TZ })} · ${todaysBookings.length} session${todaysBookings.length === 1 ? "" : "s"} today · ${formatNaira(earnings)} this month`}
        actions={[
          { label: "Open schedule", href: "/therapist/schedule", variant: "ghost" },
          { label: "Write a report", href: "/therapist/schedule" },
        ]}
      />

      {verificationBanner && (
        <div
          className={
            verificationBanner.tone === "error"
              ? "mt-4 flex items-start gap-3 rounded-xl border border-error/25 bg-error/10 p-3.5 text-sm text-[#e6a99f]"
              : "mt-4 flex items-start gap-3 rounded-xl border border-care-amber/25 bg-care-amber/10 p-3.5 text-sm text-care-amber"
          }
        >
          <IconAlertTriangle size={17} stroke={1.75} className="mt-0.5 shrink-0" />
          <span>{verificationBanner.text}</span>
        </div>
      )}

      <OnboardingChecklist status={onboarding} />

      {session.isSupervisor && (
        <Link
          href="/supervisor"
          className="group mt-4 flex items-center gap-3 rounded-xl border border-care-sage/25 bg-care-sage/10 p-3.5 transition-colors hover:border-care-sage/40"
        >
          <IconShieldCheck size={18} stroke={1.75} className="shrink-0 text-care-sage" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-care-sage">You have supervisor access</p>
            <p className="text-xs text-care-sage/80">Oversee your assigned therapists from the Supervisor portal.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-care-sage sm:inline-flex">
            Open <IconArrowRight size={12} stroke={2.5} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-12">
        <div className="grid grid-cols-2 gap-3.5 md:contents">
          <div className="md:col-span-3">
            <CareStat
              icon={IconUsers}
              label="Active clients"
              value={String(activeClients)}
              sub="on your caseload"
              href="/therapist/caseload"
            />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconCalendarEvent}
              label="Sessions today"
              value={String(todaysBookings.length)}
              sub={nextBooking ? `next at ${formatTime(nextBooking.slotStartTime)}` : "none scheduled"}
              href="/therapist/schedule"
            />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconFileText}
              label="Reports due"
              value={String(reportSummary.needsReportCount)}
              delta={reportSummary.needsReportCount > 0 ? { text: "action", good: false } : undefined}
              sub={`${reportSummary.draftCount} draft · ${reportSummary.publishedCount} published`}
              href="/therapist/schedule"
            />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconWallet}
              label="This month"
              value={formatNaira(earnings)}
              delta={earningsDelta != null ? { text: `${earningsDelta >= 0 ? "+" : ""}${earningsDelta}%`, good: earningsDelta >= 0 } : undefined}
              sub="earned so far"
              href="/therapist/earnings"
            />
          </div>
        </div>

        <CarePanel
          label="Earnings & sessions"
          href="/therapist/earnings"
          className="md:col-span-7"
          right={<span className="text-[11px] text-care-ink-faint">Last 6 months</span>}
        >
          <CareAreaChart data={series} />
        </CarePanel>

        <div className="flex flex-col gap-3.5 md:col-span-5">
          <CarePanel label="Next session" href="/therapist/schedule" accent>
            {nextBooking ? (
              <>
                <h3 className="mt-2 font-heading text-lg font-medium text-care-ink">
                  {nextBooking.childFirstName} · {nextBooking.sessionType.replace("_", " ")}
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-care-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    {nextBooking.sessionType === "virtual" ? (
                      <IconVideo size={13} stroke={1.75} />
                    ) : (
                      <IconMapPin size={13} stroke={1.75} />
                    )}
                    {nextBooking.sessionType === "virtual" ? "Google Meet" : nextBooking.location ?? "In-person"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconClock size={13} stroke={1.75} />
                    {formatTime(nextBooking.slotStartTime)} · {formatRelativeToNow(nextBooking.slotStartTime)}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-care-ink-soft">No more sessions today.</p>
            )}
          </CarePanel>

          <CarePanel.Static
            label="Today's schedule"
            className="flex-1"
            right={<span className="text-[11px] text-care-ink-faint">{todaysBookings.length} sessions</span>}
            footer={{ href: "/therapist/schedule", label: "Full schedule" }}
          >
            {todaysBookings.length === 0 ? (
              <p className="py-4 text-sm text-care-ink-soft">No sessions scheduled today.</p>
            ) : (
              <div className="mt-2 flex flex-col divide-y divide-care-line/60">
                {todaysBookings.map((b, i) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-care-ink">
                        {b.childFirstName} · <span className="capitalize">{b.sessionType.replace("_", " ")}</span>
                      </p>
                      <p className="text-[11px] text-care-ink-faint">
                        {b.sessionType === "virtual" ? "Google Meet" : b.location ?? "In-person"}
                      </p>
                    </div>
                    <span className={i === 0 ? "shrink-0 text-[13px] font-semibold text-care-accent" : "shrink-0 text-[13px] text-care-ink-soft"}>
                      {formatTime(b.slotStartTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CarePanel.Static>
        </div>

        <CarePanel.Static
          label="Needs attention"
          className="md:col-span-6"
        >
          {caughtUp ? (
            <p className="py-4 text-sm text-care-ink-soft">You&apos;re all caught up.</p>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-care-line/60">
              {reportSummary.needsReportSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/therapist/children/${s.childId}/sessions/${s.id}`}
                  className="flex gap-3 py-2.5 hover:opacity-80"
                >
                  <IconFileText size={15} stroke={1.75} className="mt-0.5 shrink-0 text-care-amber" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-care-ink">Report needed: {s.childFirstName}</p>
                    <p className="text-[11.5px] text-care-ink-faint">Session on {formatDate(s.sessionDate)} still needs a report</p>
                  </div>
                </Link>
              ))}
              {awaitingReplyThreads.map((t) => (
                <Link
                  key={t.bookingId}
                  href={`/therapist/messages/${t.bookingId}`}
                  className="flex gap-3 py-2.5 hover:opacity-80"
                >
                  <IconMessage size={15} stroke={1.75} className="mt-0.5 shrink-0 text-care-accent" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-care-ink">New message · {t.counterpartName}</p>
                    <p className="truncate text-[11.5px] text-care-ink-faint">{t.lastMessage}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CarePanel.Static>

        <CarePanel.Static
          label="Messages awaiting reply"
          className="md:col-span-6"
          footer={{ href: "/therapist/messages", label: "All messages" }}
        >
          <div className="mt-2 flex flex-col divide-y divide-care-line/60">
            {awaitingReplyThreads.length === 0 ? (
              <p className="py-4 text-sm text-care-ink-soft">Nothing waiting on you.</p>
            ) : (
              awaitingReplyThreads.slice(0, 3).map((t) => (
                <Link
                  key={t.bookingId}
                  href={`/therapist/messages/${t.bookingId}`}
                  className="flex items-center gap-3 py-2.5 hover:opacity-80"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-care-raised text-[10px] font-bold text-care-ink-soft">
                    {t.counterpartName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-care-ink">{t.counterpartName}</p>
                    <p className="truncate text-[11.5px] text-care-ink-faint">{t.lastMessage}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CarePanel.Static>
      </div>
    </CareShell>
  );
}
