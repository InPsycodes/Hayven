import { cn } from "@/lib/utils";
import { formatDate } from "@/data/format";
import { OUTCOME_LABEL, type HomePracticeActivity, type HomePracticeOutcome } from "@/lib/home-practice/types";
import { HomePracticeNextStepButtons } from "@/components/therapist/home-practice-next-step";

const OUTCOME_DOT: Record<HomePracticeOutcome, string> = {
  good: "bg-success",
  mixed: "bg-amber",
  hard: "bg-error",
};

function shortDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function summary(a: HomePracticeActivity): string {
  if (a.tries.length === 0) return "No tries logged yet";
  const count = (o: HomePracticeOutcome) => a.tries.filter((t) => t.outcome === o).length;
  const parts = [
    count("good") && `${count("good")} went well`,
    count("mixed") && `${count("mixed")} so-so`,
    count("hard") && `${count("hard")} hard`,
  ].filter(Boolean);
  return `${a.tries.length} ${a.tries.length === 1 ? "try" : "tries"} · ${parts.join(", ")}`;
}

/**
 * What the family logged against the home practice since it was set: read
 * before the next session. Activities with a hard try come first (the query
 * sorts them). Every care-team therapist sees all of the child's activities;
 * only the one who set an activity can keep, change or finish it.
 */
export function HomePracticePanel({
  childName,
  activities,
  therapistProfileId,
}: {
  childName: string;
  activities: HomePracticeActivity[];
  therapistProfileId: string;
}) {
  const since = activities.reduce((min, a) => (!min || a.setOn < min ? a.setOn : min), "");
  const hardCount = activities.filter((a) => a.tries.some((t) => t.outcome === "hard")).length;

  return (
    <div className="rounded-sm bg-card p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg text-charcoal">Home practice since {formatDate(since)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            What {childName}&apos;s family logged at home. Read it before the next session.
          </p>
        </div>
        {hardCount > 0 && (
          <span className="rounded-full bg-error/15 px-2.5 py-1 text-xs font-medium text-error-text">
            {hardCount === 1 ? "1 activity was hard" : `${hardCount} activities were hard`}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {activities.map((a) => {
          const hard = a.tries.some((t) => t.outcome === "hard");
          const goingWell = !hard && a.tries.length >= 3;
          const notes = a.tries.filter((t) => t.note);
          const own = a.therapistId === therapistProfileId;
          return (
            <div
              key={a.id}
              className={cn("flex flex-col gap-3 rounded-sm bg-inset p-4 ring-1", hard ? "ring-error/40" : "ring-border")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-charcoal">{a.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Set {formatDate(a.setOn)}
                    {own ? "" : ` by ${a.therapistName}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                    hard
                      ? "bg-error/15 text-error-text"
                      : goingWell
                        ? "bg-success/15 text-success-text"
                        : "bg-paper text-muted-foreground"
                  )}
                >
                  {hard ? "Hard for them" : goingWell ? "Going well" : a.tries.length === 0 ? "Not started" : "Early days"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                {a.tries.length > 0 && (
                  <span className="flex gap-1" aria-hidden>
                    {a.tries.map((t) => (
                      <span key={t.loggedOn} className={cn("size-3 rounded-full", OUTCOME_DOT[t.outcome])} />
                    ))}
                  </span>
                )}
                <span>{summary(a)}</span>
              </div>

              {notes.length > 0 && (
                <div className="flex flex-col gap-2">
                  {notes.map((t) => (
                    <blockquote
                      key={t.loggedOn}
                      className={cn("border-l-2 pl-3 text-sm text-charcoal", t.outcome === "hard" ? "border-error" : "border-border")}
                    >
                      &ldquo;{t.note}&rdquo;
                      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                        {shortDay(t.loggedOn)} · {OUTCOME_LABEL[t.outcome]}
                      </span>
                    </blockquote>
                  ))}
                </div>
              )}

              {own && (
                <div className="border-t border-border pt-3">
                  <HomePracticeNextStepButtons activityId={a.id} current={a.nextStep} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
