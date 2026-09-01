import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconUsers,
  IconBabyCarriage,
  IconSparkles,
  IconUserCheck,
  IconShieldLock,
} from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PanelCard } from "@/components/dashboard/panel-card";
import { Reveal } from "@/components/marketing/reveal";
import { getSession } from "@/lib/auth/session";
import { getMySupervisedTherapists, getMyTeamAssignments } from "@/lib/supervisor/queries";
import { initialsFromName, formatDate } from "@/data/format";

export default async function SupervisorTeamPage() {
  const session = await getSession();
  if (!session || !(session.role === "supervisor" || (session.role === "therapist" && session.isSupervisor))) {
    redirect("/login");
  }

  const [therapists, assignments] = await Promise.all([
    getMySupervisedTherapists(session.userId),
    getMyTeamAssignments(session.userId),
  ]);

  const childrenSupported = new Set(assignments.map((a) => a.childName)).size;
  const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
  const newThisMonth = assignments.filter((a) => new Date(a.startedOn) >= thirtyDaysAgo).length;
  const quietTherapists = therapists.filter((t) => t.childCount === 0).length;

  return (
    <div className="min-h-full bg-gradient-to-b from-terracotta/[0.09] via-background to-background">
      <DashboardHeader
        session={session}
        eyebrow="Overseeing"
        greeting="Your team"
        subtext={`${therapists.length} ${therapists.length === 1 ? "therapist" : "therapists"} · ${childrenSupported} ${childrenSupported === 1 ? "child" : "children"} supported`}
      />

      {therapists.length === 0 ? (
        <div className="px-5 py-6 md:px-10">
          <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            No therapists are assigned to you yet. An admin can set this up from the Assignments page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-5 py-6 md:grid-cols-12 md:px-10">
          {/* Stat tiles */}
          <div className="grid min-w-0 grid-cols-2 gap-4 md:contents">
          <Reveal delayMs={0} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconUsers}
              tone="accent"
              value={String(therapists.length)}
              label={therapists.length === 1 ? "Therapist on your team" : "Therapists on your team"}
              href="/supervisor/assignments"
              dest="Assignments"
            />
          </Reveal>
          <Reveal delayMs={60} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconBabyCarriage}
              tone="sage"
              value={String(childrenSupported)}
              label={childrenSupported === 1 ? "Child supported" : "Children supported"}
              href="/supervisor/assignments"
              dest="Assignments"
            />
          </Reveal>
          <Reveal delayMs={120} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconSparkles}
              tone="ink"
              value={String(newThisMonth)}
              label="New assignments (30 days)"
              href="/supervisor/assignments"
              dest="Assignments"
            />
          </Reveal>
          <Reveal delayMs={180} className="min-w-0 md:col-span-3">
            <StatTile
              icon={IconUserCheck}
              tone={quietTherapists > 0 ? "amber" : "ink"}
              value={String(quietTherapists)}
              label={quietTherapists === 1 ? "Therapist with no caseload" : "Therapists with no caseload"}
              href="/supervisor/assignments"
              dest="Assignments"
              pill={quietTherapists > 0 ? { tone: "due", text: "REVIEW" } : undefined}
            />
          </Reveal>
          </div>

          {/* Team table */}
          <Reveal delayMs={240} className="min-w-0 md:col-span-8">
            <PanelCard.Static
              label="Team"
              className="h-full"
              headerRight={
                <span className="text-xs text-muted-foreground">Row → that therapist&apos;s caseload</span>
              }
            >
              <div className="mt-3 -mx-1 overflow-x-auto">
                <table className="w-full min-w-[380px] border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left">
                      <th className="label-micro px-1 pb-2 font-medium text-muted-foreground">Therapist</th>
                      <th className="label-micro px-1 pb-2 text-right font-medium text-muted-foreground tabular-nums">
                        Children
                      </th>
                      <th className="px-1 pb-2" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {therapists.map((t) => (
                      <tr key={t.id} className="group/row border-t border-border/60">
                        <td className="px-1 py-2.5">
                          <Link
                            href={`/supervisor/therapists/${t.id}`}
                            className="flex items-center gap-2.5 hover:opacity-80"
                          >
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-[10px] font-bold text-terracotta">
                              {initialsFromName(t.name)}
                            </span>
                            <span className="font-medium text-charcoal">{t.name}</span>
                            {t.childCount === 0 && (
                              <span className="size-1.5 shrink-0 rounded-full bg-amber" title="No active caseload" />
                            )}
                          </Link>
                        </td>
                        <td className="px-1 py-2.5 text-right tabular-nums text-charcoal">{t.childCount}</td>
                        <td className="px-1 py-2.5 text-right">
                          <Link href={`/supervisor/therapists/${t.id}`} aria-label={`Open ${t.name}`}>
                            <IconArrowRight
                              size={14}
                              stroke={1.75}
                              className="ml-auto text-muted-foreground transition-transform group-hover/row:translate-x-0.5"
                            />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard.Static>
          </Reveal>

          {/* Settings */}
          <Reveal delayMs={300} className="min-w-0 md:col-span-4">
            <PanelCard
              href="/supervisor/settings"
              label="Oversight"
              dest="Supervisor settings"
              className="h-full"
            >
              <div className="mt-3 flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-charcoal/[0.06] text-charcoal/70">
                  <IconShieldLock size={18} stroke={1.75} />
                </span>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Set your report-review cadence, flagged-session alerts, and access to session notes.
                </p>
              </div>
            </PanelCard>
          </Reveal>

          {/* Recent assignments */}
          <Reveal delayMs={360} className="min-w-0 md:col-span-12">
            <PanelCard.Static
              label="Recent assignments"
              className="h-full"
              footer={{ href: "/supervisor/assignments", dest: "Manage assignments" }}
            >
              <div className="mt-3 flex flex-col">
                {assignments.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">No active assignments yet.</p>
                ) : (
                  assignments.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 border-t border-border/60 py-2.5 first:border-t-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-charcoal">
                          {a.childName} → {a.therapistName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground capitalize">
                          {a.therapyType ?? "Therapy"} · started {formatDate(a.startedOn)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PanelCard.Static>
          </Reveal>
        </div>
      )}
    </div>
  );
}
