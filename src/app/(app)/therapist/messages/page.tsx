import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { ThreadList } from "@/components/messages/thread-list";
import { getSession } from "@/lib/auth/session";
import { getMessageThreadsForUser } from "@/data/queries";

export default async function TherapistMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const threads = await getMessageThreadsForUser(session.userId);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Messages"
        subtext={`${threads.length} conversation${threads.length === 1 ? "" : "s"}`}
      />
      <div className="py-2">
        <ThreadList threads={threads} basePath="/therapist/messages" />
      </div>
    </div>
  );
}
