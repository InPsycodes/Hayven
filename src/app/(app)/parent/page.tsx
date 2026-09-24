import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconTargetArrow,
  IconCalendarCheck,
  IconFileText,
  IconClipboardCheck,
  IconVideo,
  IconMapPin,
  IconClock,
  IconQuote,
} from "@tabler/icons-react";

import { CareShell } from "@/components/care/care-shell";
import { CareHeader } from "@/components/care/care-header";
import { CareStat } from "@/components/care/care-stat";
import { CarePanel } from "@/components/care/care-panel";
import { CareBarChart } from "@/components/care/care-bar-chart";
import { ChildSwitcher } from "@/components/dashboard/child-switcher";
import { getSession } from "@/lib/auth/session";
import { ageFromDob, formatDateTime, formatRelativeToNow, formatShortDate, shortName } from "@/data/format";
import { getIntakeFormForChild } from "@/lib/intake/queries";
import { intakeProgress } from "@/lib/intake/schema";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import { getRealNextUpcomingBookingForChild, getRealBookingsForParent } from "@/lib/booking/queries";
import { getPublishedReportsForChild } from "@/lib/reports/queries";
import { renderReportBody, extractReportSnippet } from "@/lib/reports/generate";
import { getChildGoalsForParent, weeklyAttendance } from "@/lib/dashboard/care";

interface ParentDashboardProps {
  searchParams: Promise<{ child?: string }>;
}

const DOMAIN_LABEL = (d: string | null) => (d ? d.replace(/_/g, " ") : "General");

export default async function ParentDashboardPage({ searchParams }: ParentDashboardProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { child: childParam } = await searchParams;
  const allChildren = await getRealChildrenForParent(session.userId);
  const activeChild = allChildren.find((c) => c.id === childParam) ?? allChildren[0];

  const [nextSession, reports, allBookings, intakeForm, goals] = await Promise.all([
    activeChild ? getRealNextUpcomingBookingForChild(activeChild.id) : null,
    activeChild ? getPublishedReportsForChild(activeChild.id) : [],
    getRealBookingsForParent(session.userId),
    activeChild ? getIntakeFormForChild(activeChild.id) : null,
    activeChild ? getChildGoalsForParent(activeChild.id) : [],
  ]);

  const intakeProg = intakeProgress(
    intakeForm?.details ?? {},
    intakeForm?.consents ?? [],
    activeChild?.firstName
  );
  const intakeDone = intakeProg.complete;
  const intakeTotal = intakeProg.total;

  const childBookings = activeChild ? allBookings.filter((b) => b.childId === activeChild.id) : [];
  const nowMs = new Date().getTime();
  const past = childBookings.filter((b) => b.slotStartTime && new Date(b.slotStartTime).getTime() <= nowMs);
  const attended = past.filter((b) => b.status === "completed" || b.status === "confirmed").length;
  const attendancePct = past.length ? Math.round((attended / past.length) * 100) : 0;
  const attendanceWeeks = weeklyAttendance(childBookings, 14);

  const goalsOnTrack = goals.filter((g) => g.status === "active" || g.status === "met").length;
  const noteSnippets = activeChild
    ? reports.slice(0, 2).map((r) => ({
        text: extractReportSnippet(renderReportBody(r.parentBody, activeChild.firstName)),
        when: formatShortDate(r.publishedAt),
      }))
    : [];

  const reportsHref = activeChild ? `/parent/children/${activeChild.id}/reports` : "/parent/children";
  const intakeHref = activeChild ? `/parent/children/${activeChild.id}/intake` : "/parent/children";

  const statusPill =
    goals.length > 0 && goalsOnTrack === goals.length
      ? ({ label: "On track", tone: "ok" } as const)
      : intakeDone < intakeTotal
        ? ({ label: "Intake pending", tone: "warn" } as const)
        : undefined;

  const metaParts = activeChild
    ? [
        `Age ${ageFromDob(activeChild.dateOfBirth)}`,
        `${attended} session${attended === 1 ? "" : "s"} attended`,
        `${reports.length} report${reports.length === 1 ? "" : "s"}`,
      ]
    : ["Let's get set up"];

  return (
    <CareShell>
      <CareHeader
        session={session}
        initials={activeChild ? activeChild.firstName.slice(0, 2).toUpperCase() : "H"}
        title={activeChild ? activeChild.firstName : `Welcome, ${shortName(session.name)}`}
        status={statusPill}
        meta={metaParts.join(" · ")}
        actions={[
          { label: "View reports", href: reportsHref, variant: "ghost" },
          { label: "Book session", href: "/search" },
        ]}
      />

      {allChildren.length > 1 && activeChild && (
        <Suspense>
          <ChildSwitcher kids={allChildren} activeId={activeChild.id} />
        </Suspense>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-12">
        <div className="grid grid-cols-2 gap-3.5 md:contents">
          <div className="md:col-span-3">
            <CareStat
              icon={IconTargetArrow}
              label="Goals on track"
              value={goals.length ? `${goalsOnTrack}/${goals.length}` : "n/a"}
              sub={goals.length ? "set by your therapist" : "none set yet"}
              bar={goals.length ? { pct: (goalsOnTrack / goals.length) * 100, tone: "sage" } : undefined}
              href={reportsHref}
            />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconCalendarCheck}
              label="Attendance"
              value={past.length ? `${attendancePct}%` : "n/a"}
              sub={past.length ? `${attended} of ${past.length} sessions` : "no sessions yet"}
              bar={past.length ? { pct: attendancePct, tone: "sage" } : undefined}
              href="/parent/sessions"
            />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconFileText}
              label="Reports"
              value={String(reports.length)}
              sub={reports.length ? `latest ${formatShortDate(reports[0].publishedAt)}` : "none published yet"}
              href={reportsHref}
            />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconClipboardCheck}
              label="Intake form"
              value={`${intakeDone}/${intakeTotal}`}
              sub={
                intakeDone < intakeTotal
                  ? `${intakeTotal - intakeDone} section${intakeTotal - intakeDone === 1 ? "" : "s"} left`
                  : "complete"
              }
              bar={{ pct: (intakeDone / intakeTotal) * 100, tone: intakeDone === intakeTotal ? "sage" : "accent" }}
              href={intakeHref}
            />
          </div>
        </div>

        {/* Therapy goals */}
        <CarePanel
          label="Therapy goals"
          href={reportsHref}
          className="md:col-span-7"
          right={<span className="text-[11px] text-care-ink-faint">{goals.length} total</span>}
        >
          {goals.length === 0 ? (
            <p className="mt-4 py-6 text-sm text-care-ink-soft">
              Your therapist will set goals for {activeChild?.firstName ?? "your child"} after the assessment.
              You&apos;ll see progress here once sessions begin.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-care-line/60">
              {goals.slice(0, 6).map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-care-ink">{g.title}</p>
                    <p className="text-[11px] uppercase tracking-wide text-care-ink-faint">{DOMAIN_LABEL(g.domain)}</p>
                  </div>
                  <span
                    className={
                      g.status === "met"
                        ? "shrink-0 rounded-full bg-care-sage/15 px-2 py-0.5 text-[10.5px] font-semibold text-care-sage"
                        : g.status === "active"
                          ? "shrink-0 rounded-full bg-care-accent/15 px-2 py-0.5 text-[10.5px] font-semibold text-care-accent"
                          : "shrink-0 rounded-full bg-care-ink-faint/15 px-2 py-0.5 text-[10.5px] font-semibold text-care-ink-faint"
                    }
                  >
                    {g.status === "met" ? "Met" : g.status === "active" ? "In progress" : g.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-care-accent">
            Open reports <IconArrowRight size={12} stroke={2.5} aria-hidden />
          </span>
        </CarePanel>

        {/* Right column: next appointment + attendance chart */}
        <div className="flex flex-col gap-3.5 md:col-span-5">
          <CarePanel label="Next appointment" href="/parent/sessions" accent>
            {nextSession ? (
              <>
                <h3 className="mt-2 font-heading text-lg font-medium capitalize text-care-ink">
                  {nextSession.sessionType.replace("_", " ")} with {nextSession.therapistDisplayName}
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-care-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    {nextSession.sessionType === "virtual" ? (
                      <IconVideo size={13} stroke={1.75} />
                    ) : (
                      <IconMapPin size={13} stroke={1.75} />
                    )}
                    {nextSession.sessionType === "virtual"
                      ? "Google Meet"
                      : nextSession.location ?? nextSession.therapistLocation ?? "In-person"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconClock size={13} stroke={1.75} />
                    {formatDateTime(nextSession.slotStartTime)} · {formatRelativeToNow(nextSession.slotStartTime)}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-care-ink-soft">
                No upcoming session booked. Find a therapist to get started.
              </p>
            )}
          </CarePanel>

          <CarePanel
            label="Attendance"
            href="/parent/sessions"
            className="flex-1"
            right={<span className="text-[11px] text-care-ink-faint">14 weeks</span>}
          >
            {past.length === 0 ? (
              <p className="mt-4 py-6 text-sm text-care-ink-soft">
                Session attendance shows here once {activeChild?.firstName ?? "your child"} has had a session.
              </p>
            ) : (
              <>
                <CareBarChart data={attendanceWeeks} />
                <p className="mt-2 text-[11px] text-care-ink-faint">
                  {attendanceWeeks.reduce((n, w) => n + w.attended, 0)} attended ·{" "}
                  {attendanceWeeks.reduce((n, w) => n + w.missed, 0)} missed
                </p>
              </>
            )}
          </CarePanel>
        </div>

        {/* Bottom row */}
        <CarePanel.Static
          label="Latest session notes"
          className="md:col-span-4"
          footer={{ href: reportsHref, label: "All reports" }}
        >
          <div className="mt-3 flex flex-col divide-y divide-care-line/60">
            {noteSnippets.length === 0 ? (
              <p className="py-4 text-sm text-care-ink-soft">
                Notes from your child&apos;s sessions appear here once a report is published.
              </p>
            ) : (
              noteSnippets.map((s, i) => (
                <div key={i} className="flex gap-2.5 py-2.5">
                  <IconQuote size={14} stroke={1.75} aria-hidden className="mt-0.5 shrink-0 text-care-ink-faint" />
                  <div className="min-w-0">
                    <p className="text-[13px] italic leading-relaxed text-care-ink-soft">&ldquo;{s.text}&rdquo;</p>
                    <p className="mt-1 text-[10.5px] uppercase tracking-wide text-care-ink-faint">Shared {s.when}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CarePanel.Static>

        <CarePanel
          label="Intake form"
          href={intakeHref}
          className="md:col-span-4"
          right={<span className="text-[11px] text-care-ink-faint">{intakeDone} of {intakeTotal}</span>}
        >
          <ul className="mt-3 flex flex-col divide-y divide-care-line/60">
            {intakeProg.sections.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="text-care-ink">{s.title}</span>
                <span
                  className={
                    s.state === "complete"
                      ? "inline-flex items-center gap-1 text-[11px] font-semibold text-care-sage"
                      : s.state === "in_progress"
                        ? "text-[11px] font-semibold text-care-amber"
                        : "text-[11px] font-semibold text-care-ink-faint"
                  }
                >
                  {s.state === "complete" ? "Complete" : s.state === "in_progress" ? "In progress" : "To do"}
                </span>
              </li>
            ))}
          </ul>
        </CarePanel>

        <CarePanel.Static
          label="Reports"
          className="md:col-span-4"
          footer={{ href: reportsHref, label: "All reports" }}
        >
          <div className="mt-3 flex flex-col divide-y divide-care-line/60">
            {reports.length === 0 ? (
              <p className="py-4 text-sm text-care-ink-soft">No reports published yet.</p>
            ) : (
              reports.slice(0, 3).map((r, i) => (
                <Link
                  key={r.id}
                  href={reportsHref}
                  className="flex items-center gap-3 py-2.5 hover:opacity-80"
                >
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center rounded bg-care-raised text-care-accent">
                    <IconFileText size={15} stroke={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-care-ink">
                      {i === 0 ? "Latest progress report" : "Progress report"}
                    </p>
                    <p className="text-[10.5px] uppercase tracking-wide text-care-ink-faint">
                      {formatShortDate(r.publishedAt)}
                      {i === 0 ? " · new" : ""}
                    </p>
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
