import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Button } from "@/components/ui/button";
import { ChartFrame } from "@/components/therapy-session/chart-frame";
import { BehaviourFrequencyChart } from "@/components/therapy-session/charts/behaviour-frequency-chart";
import { BehaviourTrendChart } from "@/components/therapy-session/charts/behaviour-trend-chart";
import { SkillAcquisitionChart } from "@/components/therapy-session/charts/skill-acquisition-chart";
import { GoalProgressChart } from "@/components/therapy-session/charts/goal-progress-chart";
import { AttendanceChart } from "@/components/therapy-session/charts/attendance-chart";
import { ReinforcerEffectivenessChart } from "@/components/therapy-session/charts/reinforcer-effectiveness-chart";
import { getSession } from "@/lib/auth/session";
import { getRealTherapistProfileByUserId } from "@/lib/therapist/queries";
import { getAssignedChildById } from "@/lib/therapy-sessions/queries";
import { getSessionSeriesWindow } from "@/lib/therapy-sessions/chart-queries";
import {
  toAttendanceSeries,
  toBehaviourFrequencySeries,
  toBehaviourTrendSeries,
  toGoalProgressMatrix,
  toReinforcerEffectiveness,
  toSkillAcquisitionSeries,
} from "@/lib/therapy-sessions/chart-series";
import { ageFromDob, formatDate } from "@/data/format";

export default async function ChildOverviewPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const therapist = await getRealTherapistProfileByUserId(session.userId);
  if (!therapist) notFound();

  const { childId } = await params;
  const child = await getAssignedChildById(childId, therapist.id);
  if (!child) notFound();

  const window = await getSessionSeriesWindow(childId);
  const attendance = toAttendanceSeries(window);
  const goalMatrix = toGoalProgressMatrix(window);
  const reinforcers = toReinforcerEffectiveness(window);
  const maxReinforcerUses = reinforcers.reduce((max, r) => Math.max(max, r.uses), 0);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting={`${child.firstName}, ${ageFromDob(child.dateOfBirth)}`}
        subtext={`${window.sessions.length} session${window.sessions.length === 1 ? "" : "s"} recorded`}
      />

      <div className="flex flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="accent" size="sm" className="w-fit">
            <Link href={`/therapist/children/${childId}/sessions/new`}>Log a new session</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href={`/therapist/children/${childId}/programme`}>Manage programme</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href={`/therapist/children/${childId}/intake`}>Intake form</Link>
          </Button>
        </div>

        {window.sessions.length > 0 && (
          <div className="rounded-sm bg-card p-5 ring-1 ring-border">
            <h2 className="font-heading text-lg text-charcoal">Sessions</h2>
            <div className="mt-3 flex flex-col gap-2">
              {window.sessions
                .slice()
                .reverse()
                .map((s) => (
                  <Link
                    key={s.id}
                    href={`/therapist/children/${childId}/sessions/${s.id}`}
                    className="flex items-center justify-between rounded-sm bg-[#F6F4F0] p-3 transition-colors hover:ring-1 hover:ring-terracotta"
                  >
                    <span className="text-sm font-medium text-charcoal">{formatDate(s.sessionDate)}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.durationMinutes ? `${s.durationMinutes} min` : "Duration not recorded"}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <ChartFrame title="Goal progress" pointCount={window.sessions.length} minPoints={1} allowSinglePoint>
            {window.goals.length > 0 ? (
              <GoalProgressChart data={goalMatrix} goals={window.goals} />
            ) : (
              <p className="text-sm text-muted-foreground">No goals set for this child yet.</p>
            )}
          </ChartFrame>

          <ChartFrame title="Attendance" pointCount={attendance.length} minPoints={1} allowSinglePoint>
            <AttendanceChart data={attendance} />
          </ChartFrame>

          {window.skills.map((skill) => {
            const series = toSkillAcquisitionSeries(window, skill.id);
            const pointCount = series.filter((p) => p.percent !== null).length;
            return (
              <ChartFrame key={skill.id} title={`Skill acquisition: ${skill.label}`} pointCount={pointCount} minPoints={2}>
                <SkillAcquisitionChart data={series} />
              </ChartFrame>
            );
          })}

          {window.behaviours.map((behaviour) => {
            const series = toBehaviourFrequencySeries(window, behaviour.id);
            const pointCount = series.filter((p) => p.value !== null).length;
            return (
              <ChartFrame
                key={`freq-${behaviour.id}`}
                title={`Behaviour frequency: ${behaviour.label}`}
                pointCount={pointCount}
                minPoints={3}
              >
                <BehaviourFrequencyChart data={series} direction={behaviour.direction} />
              </ChartFrame>
            );
          })}

          {window.behaviours.map((behaviour) => {
            const series = toBehaviourTrendSeries(window, behaviour.id);
            const pointCount = series.filter((p) => p.value !== null).length;
            return (
              <ChartFrame
                key={`trend-${behaviour.id}`}
                title={`Behaviour trend: ${behaviour.label}`}
                pointCount={pointCount}
                minPoints={4}
              >
                <BehaviourTrendChart data={series} />
              </ChartFrame>
            );
          })}

          <ChartFrame
            title="Reinforcer effectiveness"
            pointCount={maxReinforcerUses}
            minPoints={3}
            emptyMessage="No reinforcers logged yet."
          >
            <ReinforcerEffectivenessChart data={reinforcers} />
          </ChartFrame>
        </div>
      </div>
    </div>
  );
}
