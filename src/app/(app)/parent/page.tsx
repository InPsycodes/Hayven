import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconMessage,
  IconFileText,
  IconClipboardCheck,
  IconVideo,
  IconMapPin,
  IconClock,
} from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { ChildSwitcher } from "@/components/dashboard/child-switcher";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PanelCard } from "@/components/dashboard/panel-card";
import { Reveal } from "@/components/marketing/reveal";
import { getSession } from "@/lib/auth/session";
import { formatDateTime, formatRelativeToNow } from "@/data/format";
import { getRealLearningArticles } from "@/lib/learning/queries";
import { getIntakeFormForChild, intakeSectionStatuses } from "@/lib/intake/queries";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import {
  getRealNextUpcomingBookingForChild,
  getRealBookingsForParent,
} from "@/lib/booking/queries";
import { getPublishedReportsForChild } from "@/lib/reports/queries";
import { renderReportBody, extractReportSnippet } from "@/lib/reports/generate";
import { getRealMessageThreadsForParent } from "@/lib/messages/queries";

interface ParentDashboardProps {
  searchParams: Promise<{ child?: string }>;
}

export default async function ParentDashboardPage({ searchParams }: ParentDashboardProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { child: childParam } = await searchParams;
  const allChildren = await getRealChildrenForParent(session.userId);
  const activeChild = allChildren.find((c) => c.id === childParam) ?? allChildren[0];

  const [nextSession, reports, allThreads, allBookings, parentArticles, intakeForm] = await Promise.all([
    activeChild ? getRealNextUpcomingBookingForChild(activeChild.id) : null,
    activeChild ? getPublishedReportsForChild(activeChild.id) : [],
    getRealMessageThreadsForParent(session.userId),
    getRealBookingsForParent(session.userId),
    getRealLearningArticles("parent"),
    activeChild ? getIntakeFormForChild(activeChild.id) : null,
  ]);

  const intakeSections = intakeSectionStatuses(intakeForm);
  const intakeCompleteCount = intakeSections.filter((s) => s.complete).length;
  const latestReport = reports[0] ?? null;
  const latestSnippet =
    latestReport && activeChild
      ? extractReportSnippet(renderReportBody(latestReport.parentBody, activeChild.firstName))
      : null;

  // Threads with an actual message (every confirmed booking spawns a thread).
  const threads = allThreads.filter((t) => t.lastMessage !== null);
  const unreadCount = allThreads.filter(
    (t) => t.lastMessage !== null && t.lastMessageSenderId !== session.userId
  ).length;

  const nowMs = new Date().getTime();
  const upcomingCount = allBookings.filter(
    (b) => b.status === "confirmed" && b.slotStartTime && new Date(b.slotStartTime).getTime() > nowMs
  ).length;

  const recommendedArticles = parentArticles.slice(1, 3);
  const reportsHref = activeChild ? `/parent/children/${activeChild.id}/reports` : "/parent/children";
  const intakeHref = activeChild ? `/parent/children/${activeChild.id}/intake` : "/parent/children";

  return (
    <div className="min-h-full bg-gradient-to-b from-terracotta/[0.09] via-background to-background">
      <DashboardHeader
        session={session}
        eyebrow="Welcome back,"
        greeting={session.name.split(" ")[0]}
        subtext={
          allChildren.length > 0
            ? `${allChildren.length} ${allChildren.length === 1 ? "child" : "children"} under care`
            : "Let's get set up"
        }
      />

      <div className="pt-2">
        {allChildren.length > 0 && activeChild && (
          <Suspense>
            <ChildSwitcher kids={allChildren} activeId={activeChild.id} />
          </Suspense>
        )}

        <div className="grid grid-cols-1 gap-4 px-5 pb-10 pt-5 md:grid-cols-12 md:px-10">
          {/* Next session */}
          <Reveal delayMs={0} className="min-w-0 md:col-span-8">
            <PanelCard
              href="/parent/sessions"
              label={`Next session${activeChild ? ` · ${activeChild.firstName}` : ""}`}
              dest="Sessions"
              className="h-full bg-gradient-to-br from-card to-secondary/40"
            >
              {nextSession ? (
                <>
                  <p className="mt-3.5 font-mono text-xs uppercase tracking-wide text-charcoal/80">
                    {formatDateTime(nextSession.slotStartTime)}
                  </p>
                  <h2 className="mt-1.5 font-heading text-[22px] font-medium capitalize leading-snug text-charcoal">
                    {nextSession.sessionType.replace("_", " ")} with {nextSession.therapistDisplayName}
                  </h2>
                  <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {nextSession.sessionType === "virtual" ? (
                        <IconVideo size={14} stroke={1.75} />
                      ) : (
                        <IconMapPin size={14} stroke={1.75} />
                      )}
                      {nextSession.sessionType === "virtual"
                        ? "Google Meet"
                        : nextSession.location ?? nextSession.therapistLocation ?? "In-person"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <IconClock size={14} stroke={1.75} />
                      {formatRelativeToNow(nextSession.slotStartTime)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No upcoming sessions booked for {activeChild?.firstName ?? "this child"} yet.
                  Find a therapist to get started.
                </p>
              )}
            </PanelCard>
          </Reveal>

          {/* Latest progress */}
          <Reveal delayMs={80} className="min-w-0 md:col-span-4">
            <PanelCard href={reportsHref} label={`${activeChild?.firstName ?? "Your child"}'s progress`} dest="View report" className="h-full">
              {latestReport && latestSnippet ? (
                <>
                  <p className="mt-3 font-heading text-[15px] italic leading-relaxed text-ink-soft">
                    &ldquo;{latestSnippet}&rdquo;
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Shared {formatDateTime(latestReport.publishedAt)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No progress reports shared yet. Your child&apos;s therapist will publish one after a session.
                </p>
              )}
            </PanelCard>
          </Reveal>

          {/* Stat tiles */}
          <div className="grid min-w-0 grid-cols-2 gap-4 md:contents">
          <Reveal delayMs={120} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconCalendarEvent}
              tone="accent"
              value={String(upcomingCount)}
              label={upcomingCount === 1 ? "Upcoming session" : "Upcoming sessions"}
              href="/parent/sessions"
              dest="Sessions"
            />
          </Reveal>
          <Reveal delayMs={160} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconMessage}
              tone="sage"
              value={String(unreadCount)}
              label={unreadCount === 1 ? "Unread message" : "Unread messages"}
              href="/parent/messages"
              dest="Messages"
              pill={unreadCount > 0 ? { tone: "due", text: "NEW" } : undefined}
            />
          </Reveal>
          <Reveal delayMs={200} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconFileText}
              tone="ink"
              value={String(reports.length)}
              label={reports.length === 1 ? "Session report" : "Session reports"}
              href={reportsHref}
              dest="Reports"
            />
          </Reveal>
          <Reveal delayMs={240} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconClipboardCheck}
              tone={intakeCompleteCount === 4 ? "sage" : "amber"}
              value={`${intakeCompleteCount}/4`}
              label="Intake sections done"
              href={intakeHref}
              dest="Intake form"
              pill={
                intakeCompleteCount < 4
                  ? { tone: "due", text: `${4 - intakeCompleteCount} LEFT` }
                  : undefined
              }
            />
          </Reveal>
          </div>

          {/* Messages */}
          <Reveal delayMs={280} className="min-w-0 md:col-span-5">
            <PanelCard.Static
              label="Messages"
              className="h-full"
              footer={{ href: "/parent/messages", dest: "All messages" }}
            >
              <div className="mt-3 flex flex-col">
                {threads.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  threads.slice(0, 3).map((thread) => (
                    <Link
                      key={thread.bookingId}
                      href={`/parent/messages/${thread.bookingId}`}
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

          {/* Intake checklist */}
          {activeChild && (
            <Reveal delayMs={320} className="min-w-0 md:col-span-4">
              <PanelCard
                href={intakeHref}
                label={`${activeChild.firstName}'s intake form`}
                dest={intakeCompleteCount === 4 ? "Review intake form" : "Finish intake form"}
                className="h-full"
                headerRight={
                  <span className="text-xs font-medium text-muted-foreground">{intakeCompleteCount}/4</span>
                }
              >
                <div className="mt-3 flex flex-col gap-2">
                  {intakeSections.map((section) => (
                    <div key={section.key} className="flex items-center justify-between text-[13px]">
                      <span className="text-charcoal">{section.label}</span>
                      <span className={section.complete ? "font-medium text-success-text" : "font-medium text-amber-text"}>
                        {section.complete ? "Complete" : "Due"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-terracotta transition-all"
                    style={{ width: `${(intakeCompleteCount / 4) * 100}%` }}
                  />
                </div>
              </PanelCard>
            </Reveal>
          )}

          {/* Billing */}
          <Reveal delayMs={360} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconFileText}
              tone="ink"
              value="₦0"
              label="Outstanding balance"
              href="/parent/billing"
              dest="Billing & receipts"
            />
          </Reveal>

          {/* Learning Center */}
          {recommendedArticles.length > 0 && (
            <Reveal delayMs={400} className="min-w-0 md:col-span-8">
              <PanelCard.Static
                label="From the Learning Center"
                className="h-full"
                footer={{ href: "/learn", dest: "Open Learning Center" }}
              >
                <div className="mt-3 flex flex-col">
                  {recommendedArticles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/learn/${article.slug}`}
                      className="flex items-center gap-3 border-t border-border/60 py-2.5 first:border-t-0 hover:opacity-80"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-charcoal">{article.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{article.readTime}</p>
                      </div>
                      <IconArrowRight size={14} stroke={1.75} className="shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </PanelCard.Static>
            </Reveal>
          )}

          {/* Find a therapist */}
          <Reveal delayMs={440} className="min-w-0 md:col-span-4">
            <Link
              href="/search"
              className="group/promo flex h-full flex-col rounded-xl bg-gradient-to-br from-terracotta to-rust-dark p-5 text-canvas-white ring-1 ring-foreground/10 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-24px_rgba(26,26,26,.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
            >
              <span className="label-micro text-canvas-white/70">Find a therapist</span>
              <h3 className="mt-2 font-heading text-[17px] font-medium leading-snug">
                Browse verified specialists near you
              </h3>
              <p className="mt-1.5 text-xs text-canvas-white/85">
                Filter by concern, session type, and budget — matched to your child.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold">
                Browse therapists
                <IconArrowRight size={13} stroke={2.25} className="transition-transform group-hover/promo:translate-x-0.5" />
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
