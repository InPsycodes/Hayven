import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { ChildSwitcher } from "@/components/dashboard/child-switcher";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { formatDateTime } from "@/data/format";
import { ARTICLES } from "@/data/articles";
import { getLatestProgressUpdateForChild, getMessageThreadsForUser } from "@/data/queries";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import { getRealNextUpcomingBookingForChild } from "@/lib/booking/queries";

const GOAL_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  set: { label: "Just started", className: "bg-paper text-charcoal" },
  in_progress: { label: "On track", className: "bg-terracotta/10 text-terracotta" },
  achieved: { label: "Achieved", className: "bg-success/10 text-success" },
};

const GOAL_PROGRESS_WIDTH: Record<string, string> = {
  set: "w-[15%]",
  in_progress: "w-[65%]",
  achieved: "w-full",
};

interface ParentDashboardProps {
  searchParams: Promise<{ child?: string }>;
}

export default async function ParentDashboardPage({ searchParams }: ParentDashboardProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { child: childParam } = await searchParams;
  const allChildren = await getRealChildrenForParent(session.userId);
  const activeChild = allChildren.find((c) => c.id === childParam) ?? allChildren[0];

  const [nextSession, progress, threads] = await Promise.all([
    activeChild ? getRealNextUpcomingBookingForChild(activeChild.id) : null,
    activeChild ? getLatestProgressUpdateForChild(activeChild.id) : undefined,
    getMessageThreadsForUser(session.userId),
  ]);

  const recommendedArticles = ARTICLES.slice(1, 3);

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
            <Card className="p-6">
              <span className="label-micro text-terracotta">Next session</span>
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
                  <Button variant="outline" size="sm" className="mt-4">
                    Reschedule
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No upcoming sessions booked for {activeChild?.firstName ?? "this child"} yet.
                </p>
              )}
            </Card>

            {activeChild && progress && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <span className="label-micro text-muted-foreground">
                    {activeChild.firstName}&apos;s progress
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${GOAL_STATUS_LABEL[progress.goal.status].className}`}
                  >
                    {GOAL_STATUS_LABEL[progress.goal.status].label}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-charcoal">{progress.goal.title}</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper">
                  <div
                    className={`h-full rounded-full bg-terracotta ${GOAL_PROGRESS_WIDTH[progress.goal.status]}`}
                  />
                </div>
                <p className="mt-4 font-heading text-sm italic leading-relaxed text-charcoal">
                  &ldquo;{progress.quote}&rdquo;
                </p>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-6">
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
                      <p className="text-sm font-medium text-charcoal">
                        {thread.counterpart.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {thread.lastMessage.content}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </Card>

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
          </div>
        </div>
      </div>
    </div>
  );
}
