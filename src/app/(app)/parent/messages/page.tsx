import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { ThreadList } from "@/components/messages/thread-list";
import { getSession } from "@/lib/auth/session";
import { getRealMessageThreadsForParent } from "@/lib/messages/queries";

export default async function ParentMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const threads = await getRealMessageThreadsForParent(session.userId);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Messages"
        subtext={`${threads.length} conversation${threads.length === 1 ? "" : "s"}`}
      />
      <div className="px-5 py-6 md:px-10 md:py-8">
        <Card lift>
          <ThreadList threads={threads} basePath="/parent/messages" />
        </Card>
      </div>
    </div>
  );
}
