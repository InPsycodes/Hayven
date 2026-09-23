import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconUsers,
  IconBabyCarriage,
  IconSparkles,
  IconAlertTriangle,
  IconShieldLock,
} from "@tabler/icons-react";

import { CareShell } from "@/components/care/care-shell";
import { CareHeader } from "@/components/care/care-header";
import { CareStat } from "@/components/care/care-stat";
import { CarePanel } from "@/components/care/care-panel";
import { getSession } from "@/lib/auth/session";
import { getMySupervisedTherapists, getMyTeamAssignments } from "@/lib/supervisor/queries";
import { initialsFromName, formatShortDate } from "@/data/format";

export default async function SupervisorTeamPage() {
  const session = await getSession();
  if (!session || !(session.role === "therapist" && session.isSupervisor)) {
    redirect("/login");
  }

  const [therapists, assignments] = await Promise.all([
    getMySupervisedTherapists(session.userId),
    getMyTeamAssignments(session.userId),
  ]);

  const childrenSupported = new Set(assignments.map((a) => a.childName)).size;
  const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
  const newThisMonth = assignments.filter((a) => new Date(a.startedOn) >= thirtyDaysAgo).length;
  const quietTherapists = therapists.filter((t) => t.childCount === 0);

  if (therapists.length === 0) {
    return (
      <CareShell>
        <CareHeader
          session={session}
          initials={initialsFromName(session.name)}
          title="Your team"
          meta="No therapists assigned yet"
        />
        <div className="mt-6 rounded-2xl border border-care-line/60 bg-care-surface p-5 text-sm text-care-ink-soft">
          No therapists are assigned to you yet. An admin sets this up from the Assignments page.
        </div>
      </CareShell>
    );
  }

  return (
    <CareShell>
      <CareHeader
        session={session}
        initials={initialsFromName(session.name)}
        title="Your team"
        status={quietTherapists.length > 0 ? { label: `${quietTherapists.length} to review`, tone: "warn" } : undefined}
        meta={`${therapists.length} therapist${therapists.length === 1 ? "" : "s"} · ${childrenSupported} ${childrenSupported === 1 ? "child" : "children"} supported · ${assignments.length} active assignments`}
        actions={[
          { label: "Assignments", href: "/supervisor/assignments", variant: "ghost" },
          { label: "Settings", href: "/supervisor/settings" },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-12">
        <div className="grid grid-cols-2 gap-3.5 md:contents">
          <div className="md:col-span-3">
            <CareStat icon={IconUsers} label="Therapists" value={String(therapists.length)} sub="on your team" href="/supervisor/assignments" />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconBabyCarriage}
              label="Children supported"
              value={String(childrenSupported)}
              sub="across the team"
              href="/supervisor/assignments"
            />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconSparkles}
              label="New assignments"
              value={String(newThisMonth)}
              sub="last 30 days"
              href="/supervisor/assignments"
            />
          </div>
          <div className="md:col-span-3">
            <CareStat
              icon={IconAlertTriangle}
              label="Quiet therapists"
              value={String(quietTherapists.length)}
              delta={quietTherapists.length > 0 ? { text: "review", good: false } : undefined}
              sub={quietTherapists.length ? "no active caseload" : "all active"}
              href="/supervisor/assignments"
            />
          </div>
        </div>

        <CarePanel.Static
          label="Team"
          className="md:col-span-8"
          right={<span className="text-[11px] text-care-ink-faint">Row → their caseload</span>}
        >
          <div className="mt-2 flex flex-col divide-y divide-care-line/60">
            {therapists.map((t) => (
              <Link
                key={t.id}
                href={`/supervisor/therapists/${t.id}`}
                className="flex items-center gap-3 py-2.5 hover:opacity-80"
              >
                <span
                  className={
                    t.childCount === 0
                      ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-care-amber/15 text-[10px] font-bold text-care-amber"
                      : "flex size-8 shrink-0 items-center justify-center rounded-full bg-care-accent/15 text-[10px] font-bold text-care-accent"
                  }
                >
                  {initialsFromName(t.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-care-ink">
                    <span className="truncate">{t.name}</span>
                    {t.childCount === 0 && (
                      <span className="shrink-0 rounded-full bg-care-amber/15 px-1.5 py-px text-[9.5px] font-bold text-care-amber">
                        QUIET
                      </span>
                    )}
                  </p>
                  <p className="text-[11.5px] text-care-ink-faint">
                    {t.childCount} {t.childCount === 1 ? "child" : "children"}
                  </p>
                </div>
                <IconArrowRight size={14} stroke={1.75} aria-hidden className="shrink-0 text-care-ink-faint" />
              </Link>
            ))}
          </div>
        </CarePanel.Static>

        <div className="flex flex-col gap-3.5 md:col-span-4">
          <CarePanel.Static label="Needs your review" className="flex-1">
            {quietTherapists.length === 0 ? (
              <p className="py-4 text-sm text-care-ink-soft">Nothing needs your attention.</p>
            ) : (
              <div className="mt-2 flex flex-col divide-y divide-care-line/60">
                {quietTherapists.map((t) => (
                  <Link
                    key={t.id}
                    href={`/supervisor/therapists/${t.id}`}
                    className="flex gap-3 py-2.5 hover:opacity-80"
                  >
                    <IconAlertTriangle size={15} stroke={1.75} className="mt-0.5 shrink-0 text-care-amber" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-care-ink">{t.name}</p>
                      <p className="text-[11.5px] text-care-ink-faint">No active caseload, check in</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CarePanel.Static>

          <CarePanel label="Settings" href="/supervisor/settings" accent>
            <div className="mt-2 flex items-start gap-2.5">
              <IconShieldLock size={18} stroke={1.75} className="mt-0.5 shrink-0 text-care-accent" />
              <p className="text-[12.5px] leading-relaxed text-care-ink-soft">
                Notifications and two-factor authentication.
              </p>
            </div>
          </CarePanel>
        </div>

        <CarePanel.Static
          label="Recent assignments"
          className="md:col-span-12"
          footer={{ href: "/supervisor/assignments", label: "Manage assignments" }}
        >
          <div className="mt-2 flex flex-col divide-y divide-care-line/60">
            {assignments.length === 0 ? (
              <p className="py-4 text-sm text-care-ink-soft">No active assignments yet.</p>
            ) : (
              assignments.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-care-ink">
                      {a.childName} → {a.therapistName}
                    </p>
                    <p className="truncate text-[11.5px] capitalize text-care-ink-faint">
                      {a.therapyType ?? "Therapy"} · started {formatShortDate(a.startedOn)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CarePanel.Static>
      </div>
    </CareShell>
  );
}
