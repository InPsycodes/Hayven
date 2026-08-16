import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { ChildSwitcher } from "@/components/dashboard/child-switcher";
import { Reveal } from "@/components/marketing/reveal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { formatDateTime } from "@/data/format";
import { getArticlesForAudience } from "@/data/articles";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import { getRealNextUpcomingBookingForChild } from "@/lib/booking/queries";
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

  const [nextSession, reports, allThreads] = await Promise.all([
    activeChild ? getRealNextUpcomingBookingForChild(activeChild.id) : null,
    activeChild ? getPublishedReportsForChild(activeChild.id) : [],
    getRealMessageThreadsForParent(session.userId),
  ]);
  const latestReport = reports[0] ?? null;
  const latestSnippet =
    latestReport && activeChild
      ? extractReportSnippet(renderReportBody(latestReport.parentBody, activeChild.firstName))
      : null;

  // Only surface threads with an actual message in the dashboard preview --
  // every confirmed booking has a thread, but most haven't been said hello to yet.
  const threads = allThreads.filter((t) => t.lastMessage !== null);

  const recommendedArticles = getArticlesForAudience("parent").slice(1, 3);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting={`Good morning, ${session.name.split(" ")[0]}`}
        subtext="Here's how things are going with your children this week"
      />

      <div className="pt-6">
        {allChildren.length > 0 && activeChild && (
          <Suspense>
            <ChildSwitcher kids={allChildren} activeId={activeChild.id} />
          </Suspense>
        )}

        <div className="mt-6 grid gap-6 px-5 pb-8 md:px-10 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-6">
            <Reveal delayMs={0}>
              <Card lift className="p-6">
                <span className="label-micro text-rust-dark">Next session</span>
                {nextSession ? (
                  <>
                    <p className="mt-2 text-base font-medium text-charcoal capitalize">
                      {nextSession.sessionType.replace("_", " ")} with {nextSession.therapistDisplayName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(nextSession.slotStartTime)} ·{" "}
                      {nextSession.sessionType === "virtual"
                        ? "Virtual"
                        : (nextSession.location ?? nextSession.therapistLocation)}
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link href="/parent/sessions">Manage session</Link>
                    </Button>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No upcoming sessions booked for {activeChild?.firstName ?? "this child"} yet.
                  </p>
                )}
              </Card>
            </Reveal>

            {activeChild && (
              <Reveal delayMs={80}>
                <Card className="p-6">
                  <span className="label-micro text-muted-foreground">{activeChild.firstName}&apos;s progress</span>
                  {latestReport && latestSnippet ? (
                    <>
                      <p className="mt-3 font-heading text-sm italic leading-relaxed text-charcoal">
                        &ldquo;{latestSnippet}&rdquo;
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Shared {formatDateTime(latestReport.publishedAt)}
                        </p>
                        <Link
                          href={`/parent/children/${activeChild.id}/reports`}
                          className="text-xs font-medium text-terracotta hover:underline"
                        >
                          View full report
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No progress reports shared yet. Your child&apos;s therapist will publish one after a session.
                    </p>
                  )}
                </Card>
              </Reveal>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <Reveal delayMs={160}>
              <Card className="p-5">
                <span className="label-micro text-muted-foreground">Messages</span>
                <div className="mt-3 flex flex-col gap-3">
                  {threads.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  ) : (
                    threads.slice(0, 3).map((thread) => (
                      <Link
                        key={thread.bookingId}
                        href={`/parent/messages/${thread.bookingId}`}
                        className="block"
                      >
                        <p className="text-sm font-medium text-charcoal">{thread.counterpartName}</p>
                        <p className="truncate text-xs text-muted-foreground">{thread.lastMessage}</p>
                      </Link>
                    ))
                  )}
                </div>
              </Card>
            </Reveal>

            <Reveal delayMs={240}>
              <Card className="p-5">
                <span className="label-micro text-muted-foreground">From the Learning Center</span>
                <div className="mt-3 flex flex-col gap-3">
                  {recommendedArticles.map((article) => (
                    <Link key={article.slug} href={`/learn/${article.slug}`} className="block">
                      <p className="text-sm font-medium leading-snug text-charcoal">
                        {article.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{article.readTime}</p>
                    </Link>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
