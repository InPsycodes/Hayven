"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { logHomePracticeTry } from "@/lib/home-practice/actions";
import {
  MAX_NOTE_LENGTH,
  OUTCOME_LABEL,
  type HomePracticeActivity,
  type HomePracticeOutcome,
} from "@/lib/home-practice/types";

const OUTCOME_DOT: Record<HomePracticeOutcome, string> = {
  good: "bg-care-sage",
  mixed: "bg-care-amber",
  hard: "bg-error",
};

const OUTCOMES: HomePracticeOutcome[] = ["good", "mixed", "hard"];

function weekday(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

/**
 * "This week at home" on the parent dashboard: the activities the child's
 * therapist set, a dot per day for each try, and a quick way to log today's.
 */
export function HomePracticeCard({
  childName,
  activities,
  week,
  today,
}: {
  childName: string;
  activities: HomePracticeActivity[];
  week: string[];
  today: string;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<HomePracticeOutcome | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const therapists = [...new Set(activities.map((a) => a.therapistName))];
  const totalTries = activities.reduce((n, a) => n + a.tries.length, 0);

  const open = (activity: HomePracticeActivity) => {
    const existing = activity.tries.find((t) => t.loggedOn === today);
    setOpenId(activity.id);
    setOutcome(existing?.outcome ?? null);
    setNote(existing?.note ?? "");
    setError(null);
    setSavedId(null);
  };

  const save = (activityId: string) => {
    if (!outcome) return;
    setError(null);
    startTransition(async () => {
      const result = await logHomePracticeTry(activityId, outcome, note);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpenId(null);
      setSavedId(activityId);
      router.refresh();
    });
  };

  return (
    <section
      aria-labelledby="home-practice-title"
      className="mt-5 flex flex-col gap-4 rounded-2xl border border-care-accent/25 bg-gradient-to-br from-care-accent/10 to-transparent p-4 md:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="home-practice-title" className="font-heading text-lg text-care-ink">
            This week at home
          </h2>
          <p className="mt-0.5 text-sm text-care-ink-soft">
            From {therapists.join(" and ")}. A few minutes a day is plenty.
          </p>
        </div>
        <span className="font-mono text-xs text-care-ink-faint tabular-nums">
          {totalTries} {totalTries === 1 ? "try" : "tries"} logged
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {activities.map((activity) => {
          const isOpen = openId === activity.id;
          const loggedToday = activity.tries.some((t) => t.loggedOn === today);
          return (
            <div
              key={activity.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-care-line/60 bg-care-surface p-3.5"
            >
              <p className="text-sm text-care-ink">{activity.body}</p>

              <ol className="grid grid-cols-7 gap-1" aria-label="Tries this week">
                {week.map((day) => {
                  const t = activity.tries.find((x) => x.loggedOn === day);
                  const future = day > today;
                  const status = t ? OUTCOME_LABEL[t.outcome] : future ? "Coming up" : "No try logged";
                  return (
                    <li key={day} className="flex flex-col items-center gap-1">
                      <span
                        aria-label={`${weekday(day)}: ${status}`}
                        title={status}
                        className={cn(
                          "size-5 rounded-full",
                          t ? OUTCOME_DOT[t.outcome] : "border border-dashed border-care-line",
                          future && "opacity-40"
                        )}
                      />
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          day === today ? "text-care-ink" : "text-care-ink-faint"
                        )}
                      >
                        {weekday(day)}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {isOpen ? (
                <div className="flex flex-col gap-2.5 border-t border-care-line/60 pt-3">
                  <p className="text-sm text-care-ink-soft" id={`how-${activity.id}`}>
                    How did it go today?
                  </p>
                  <div role="group" aria-labelledby={`how-${activity.id}`} className="flex flex-wrap gap-1.5">
                    {OUTCOMES.map((o) => (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={outcome === o}
                        onClick={() => setOutcome(o)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                          outcome === o
                            ? "border-care-ink bg-care-raised text-care-ink"
                            : "border-care-line text-care-ink-soft hover:border-care-ink-faint"
                        )}
                      >
                        <span aria-hidden className={cn("size-2 rounded-full", OUTCOME_DOT[o])} />
                        {OUTCOME_LABEL[o]}
                      </button>
                    ))}
                  </div>
                  <label htmlFor={`note-${activity.id}`} className="text-xs text-care-ink-faint">
                    Anything {therapists.length === 1 ? therapists[0].split(" ")[0] : "your therapist"} should know?
                    (optional)
                  </label>
                  <textarea
                    id={`note-${activity.id}`}
                    value={note}
                    maxLength={MAX_NOTE_LENGTH}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="For example: said it once, then lost interest"
                    className="w-full resize-y rounded-lg border border-care-line bg-care-bg px-3 py-2 text-sm text-care-ink placeholder:text-care-ink-faint focus-visible:outline-2 focus-visible:outline-care-accent"
                  />
                  {error && <p className="text-sm text-error-text">{error}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => save(activity.id)}
                      disabled={!outcome || isPending}
                      className="rounded-lg bg-care-ink px-3.5 py-2 text-sm font-semibold text-care-bg transition-opacity disabled:opacity-40"
                    >
                      {isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenId(null)}
                      className="px-2 py-2 text-sm text-care-ink-soft hover:text-care-ink"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-care-ink-faint">Only {childName}&apos;s care team sees this.</p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => open(activity)}
                    className="rounded-lg bg-care-accent px-3.5 py-2 text-sm font-semibold text-care-bg transition-colors hover:bg-care-accent-deep hover:text-care-ink"
                  >
                    {loggedToday ? "Update today's try" : "Log a try today"}
                  </button>
                  {savedId === activity.id && (
                    <span role="status" className="text-sm text-care-sage">
                      Saved. {activity.therapistName.split(" ")[0]} will see it before your next session.
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
