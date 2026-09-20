import { notFound, redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { GoalForm } from "@/components/programme/goal-form";
import { BehaviourForm } from "@/components/programme/behaviour-form";
import { SkillForm } from "@/components/programme/skill-form";
import { GoalStatusSelect } from "@/components/programme/goal-status-select";
import { ActiveToggle } from "@/components/programme/active-toggle";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getAssignedChildById } from "@/lib/therapy-sessions/queries";
import { getFullChildProgramme } from "@/lib/programme/queries";
import { toggleTargetBehaviourActive, toggleSkillActive } from "@/lib/programme/actions";

export default async function ChildProgrammePage({ params }: { params: Promise<{ childId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) notFound();

  const { childId } = await params;
  const child = await getAssignedChildById(childId, therapist.id);
  if (!child) notFound();

  const programme = await getFullChildProgramme(childId);

  return (
    <div>
      <DashboardHeader session={session} greeting="Programme" subtext={child.firstName} />
      <div className="flex flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        <section className="rounded-sm bg-card p-5 ring-1 ring-border">
          <h2 className="font-heading text-lg text-charcoal">Goals</h2>
          <div className="mt-3 flex flex-col gap-2">
            {programme.goals.length === 0 ? (
              <p className="rounded-sm bg-[#F6F4F0] p-3 text-sm text-muted-foreground">No goals set yet.</p>
            ) : (
              programme.goals.map((g) => {
                const isOwnGoal = g.therapistId === therapist.id;
                return (
                  <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-[#F6F4F0] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-charcoal">{g.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {g.domain ?? "No domain"}
                        {g.baselineValue && g.targetValue ? ` · ${g.baselineValue} → ${g.targetValue}${g.unit ? ` ${g.unit}` : ""}` : ""}
                        {!isOwnGoal && g.therapistName ? ` · Set by ${g.therapistName}` : ""}
                      </p>
                    </div>
                    {isOwnGoal ? (
                      <GoalStatusSelect goalId={g.id} status={g.status} />
                    ) : (
                      <span className="h-8 shrink-0 rounded-full border border-border bg-card px-3 text-xs font-medium text-charcoal capitalize leading-8">
                        {g.status}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-4">
            <GoalForm childId={childId} />
          </div>
        </section>

        <section className="rounded-sm bg-card p-5 ring-1 ring-border">
          <h2 className="font-heading text-lg text-charcoal">Target behaviours</h2>
          <div className="mt-3 flex flex-col gap-2">
            {programme.targetBehaviours.length === 0 ? (
              <p className="rounded-sm bg-[#F6F4F0] p-3 text-sm text-muted-foreground">No target behaviours set yet.</p>
            ) : (
              programme.targetBehaviours.map((b) => {
                const canManage = b.createdBy === null || b.createdBy === therapist.id;
                return (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-[#F6F4F0] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-charcoal">
                        {b.label} <span className="text-xs font-normal text-muted-foreground">({b.direction})</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Measured by {b.measurement}
                        {b.parentLabel ? ` · shown to parents as "${b.parentLabel}"` : ""}
                      </p>
                    </div>
                    {canManage ? (
                      <ActiveToggle id={b.id} isActive={b.isActive} onToggle={toggleTargetBehaviourActive} />
                    ) : (
                      <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-muted-foreground">
                        {b.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-4">
            <BehaviourForm childId={childId} />
          </div>
        </section>

        <section className="rounded-sm bg-card p-5 ring-1 ring-border">
          <h2 className="font-heading text-lg text-charcoal">Skills</h2>
          <div className="mt-3 flex flex-col gap-2">
            {programme.skills.length === 0 ? (
              <p className="rounded-sm bg-[#F6F4F0] p-3 text-sm text-muted-foreground">No skills tracked yet.</p>
            ) : (
              programme.skills.map((s) => {
                const canManage = s.createdBy === null || s.createdBy === therapist.id;
                return (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-[#F6F4F0] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-charcoal">{s.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.currentPercent != null ? `${s.currentPercent}% independent · ` : ""}
                        {s.masteryCriteria ?? "No mastery criteria set"}
                      </p>
                    </div>
                    {canManage ? (
                      <ActiveToggle id={s.id} isActive={s.isActive} onToggle={toggleSkillActive} />
                    ) : (
                      <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-muted-foreground">
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-4">
            <SkillForm childId={childId} />
          </div>
        </section>
      </div>
    </div>
  );
}
