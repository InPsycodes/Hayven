import { redirect } from "next/navigation";
import { IconPhone } from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { RaiseConcernForm } from "@/components/therapist/raise-concern-form";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getMyRaisedConcerns, getRaisableChildren } from "@/lib/safeguarding/queries";
import { SAFEGUARDING_CONTACTS, EMERGENCY_NUMBER } from "@/content/safeguarding";
import { formatDateTime } from "@/data/format";

export default async function TherapistSafeguardingPage() {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  const [children, raised] = await Promise.all([
    therapist ? getRaisableChildren(therapist.id) : Promise.resolve([]),
    getMyRaisedConcerns(session.userId),
  ]);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Raise a safeguarding concern"
        subtext="For worries about a child's safety or welfare. This goes only to the safeguarding lead, not to general support."
      />
      <div className="flex max-w-2xl flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        <div className="rounded-sm bg-error/8 p-4 ring-1 ring-error/25">
          <p className="text-sm font-semibold text-error-text">If a child is in danger right now</p>
          <p className="mt-1 text-sm text-charcoal">
            Phone the safeguarding lead now. If neither lead answers, call the police on{" "}
            <a href={`tel:${EMERGENCY_NUMBER}`} className="font-semibold underline">
              {EMERGENCY_NUMBER}
            </a>
            , then tell the lead as soon as you can.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-6">
            {SAFEGUARDING_CONTACTS.map((c) => (
              <a key={c.role} href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-charcoal hover:opacity-80">
                <IconPhone size={16} className="shrink-0 text-error-text" aria-hidden />
                <span>
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="text-muted-foreground">
                    ({c.role}) {c.phone}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <h2 className="font-heading text-base text-charcoal">Log a concern</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Use this the same day for anything that worries you. When in doubt, raise it: the lead decides what
            happens next. Don&apos;t investigate or confront anyone yourself.
          </p>
          <RaiseConcernForm caseload={children} />
        </Card>

        {raised.length > 0 && (
          <div>
            <h2 className="mb-2 font-heading text-base text-charcoal">Concerns you&apos;ve raised</h2>
            <Card className="p-2">
              <div className="flex flex-col divide-y divide-border">
                {raised.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-charcoal">{r.childFirstName ?? "No specific child"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                    </div>
                    <StatusBadge tone={r.actioned ? "sage" : "amber"}>{r.actioned ? "Actioned" : "With the lead"}</StatusBadge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
