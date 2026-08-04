import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { ThreadList } from "@/components/messages/thread-list";
import { IncompleteProfileNotice } from "@/components/shared/incomplete-profile-notice";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getRealMessageThreadsForTherapist } from "@/lib/messages/queries";

export default async function TherapistMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) return <IncompleteProfileNotice />;

  const threads = await getRealMessageThreadsForTherapist(therapist.id);

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
