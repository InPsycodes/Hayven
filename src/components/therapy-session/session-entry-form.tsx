"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTherapySession, type FormState } from "@/lib/therapy-sessions/actions";
import type { ChildProgramme } from "@/lib/therapy-sessions/types";
import { SkillDomainFields } from "@/components/therapy-session/skill-domain-fields";
import { AbcObservationBuilder } from "@/components/therapy-session/abc-observation-builder";

/**
 * E17 from the external PRD review: unlike the intake form (which
 * autosaves every 900ms), this form had no draft protection at all --
 * ServiceWorkerUpdater (which force-reloads on a deployed app update) or a
 * plain accidental tab close mid-session could wipe a therapist's typing
 * with no way back. A full server-backed real-time draft (matching every
 * dynamic sub-section, including the add-able ABC rows) would be a much
 * larger feature than the actual risk warrants -- this is a lighter,
 * right-sized fix: periodically snapshot the form to localStorage (a
 * per-browser safety net, never synced or read back by the server), and
 * offer to restore it if the page loads with one still sitting there.
 */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const DRAFT_KEY_PREFIX = "hayven:session-draft:";

function draftKey(childId: string): string {
  return `${DRAFT_KEY_PREFIX}${childId}`;
}

interface SavedDraft {
  savedAt: string;
  fields: Record<string, string>;
}

/**
 * The lazy per-child TTL check below only prunes THIS child's draft, and
 * only when this exact page happens to be visited again -- a therapist who
 * starts drafts for several children and never returns to most of them
 * would otherwise leave every one of those sitting in localStorage
 * indefinitely, well past the 24h the restore offer implies. Sweeps every
 * hayven:session-draft:* key on each mount, not just the current child's.
 */
function sweepExpiredDrafts(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(DRAFT_KEY_PREFIX)) continue;
      try {
        const draft = JSON.parse(localStorage.getItem(key) ?? "") as SavedDraft;
        if (Date.now() - new Date(draft.savedAt).getTime() > DRAFT_TTL_MS) toRemove.push(key);
      } catch {
        toRemove.push(key); // corrupt entry -- no reason to keep it either
      }
    }
    for (const key of toRemove) localStorage.removeItem(key);
  } catch {
    // Storage unreachable -- nothing to sweep.
  }
}

const MEASUREMENT_LABEL: Record<string, string> = {
  frequency: "Count this session",
  duration: "Total duration (seconds)",
  intensity: "Intensity (1-5)",
  percent: "Percent of intervals",
  latency: "Latency (seconds)",
};

const PROMPT_LEVELS = [
  { value: "independent", label: "Independent" },
  { value: "gestural", label: "Gestural" },
  { value: "verbal", label: "Verbal" },
  { value: "partial_physical", label: "Partial physical" },
  { value: "full_physical", label: "Full physical" },
];

const initialState: FormState = {};

export function SessionEntryForm({
  childId,
  childName,
  programme,
}: {
  childId: string;
  childName: string;
  programme: ChildProgramme;
}) {
  const boundAction = createTherapySession.bind(null, childId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const formRef = useRef<HTMLFormElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [abcInitialCount, setAbcInitialCount] = useState(0);

  // Lazy initializer, not an effect: reading localStorage is synchronous,
  // so there's no reason to defer it a render and risk offering a draft
  // that then vanishes on a second pass. Runs once, on this component's
  // first render for this child.
  const [pendingDraft, setPendingDraft] = useState<SavedDraft | null>(() => {
    sweepExpiredDrafts();
    try {
      const raw = localStorage.getItem(draftKey(childId));
      if (!raw) return null;
      const draft = JSON.parse(raw) as SavedDraft;
      if (Date.now() - new Date(draft.savedAt).getTime() > DRAFT_TTL_MS) {
        localStorage.removeItem(draftKey(childId));
        return null;
      }
      return draft;
    } catch {
      // Corrupt/blocked storage -- nothing to restore, nothing to crash over.
      return null;
    }
  });

  function saveDraft() {
    if (!formRef.current) return;
    try {
      const fields = Object.fromEntries(new FormData(formRef.current).entries()) as Record<string, string>;
      // confidentialNote is deliberately excluded. It's the one field this
      // form collects that the database itself won't even let the owning
      // therapist read back through a normal query (column-revoked,
      // service-role-only access re-checked against assignment -- see
      // src/lib/therapy-sessions/confidential.ts) -- mirroring it into
      // plaintext localStorage would undercut that restriction for no
      // reason a session-loss safety net actually needs to cover.
      delete fields.confidentialNote;
      localStorage.setItem(draftKey(childId), JSON.stringify({ savedAt: new Date().toISOString(), fields }));
    } catch {
      // Private window / cleared site data / storage quota -- the form
      // itself still has everything the user typed, so this is a missed
      // safety net, not data loss.
    }
  }

  function scheduleDraftSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveDraft, 900);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey(childId));
    } catch {
      // Nothing to clean up if storage was never reachable.
    }
    setPendingDraft(null);
  }

  function restoreDraft() {
    if (!pendingDraft || !formRef.current) return;
    const form = formRef.current;
    const abcCount = Number(pendingDraft.fields.abcCount ?? 0);
    setAbcInitialCount(abcCount);

    const setFieldValue = (name: string, value: string) => {
      // RadioNodeList (the "setting" radio group) also exposes a .value
      // setter that checks the matching radio -- same interface as a plain
      // input/select/textarea for this purpose, which is all that's read.
      const field = form.elements.namedItem(name) as { value: string } | null;
      if (field) field.value = value;
    };

    // The abc_N_* rows don't exist in the DOM until AbcObservationBuilder
    // re-renders with the bumped initialCount above -- restoring those
    // specific fields waits one tick for that render to land.
    for (const [name, value] of Object.entries(pendingDraft.fields)) {
      if (name === "abcCount" || name.startsWith("abc_")) continue;
      setFieldValue(name, value);
    }

    if (abcCount > 0) {
      setTimeout(() => {
        for (const [name, value] of Object.entries(pendingDraft.fields)) {
          if (name.startsWith("abc_")) setFieldValue(name, value);
        }
      }, 0);
    }

    setPendingDraft(null);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={scheduleDraftSave}
      onSubmit={() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        discardDraft();
      }}
      className="flex flex-col gap-8 p-6 pb-28 md:p-8"
    >
      {pendingDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-accent/10 p-4 ring-1 ring-accent/30">
          <p className="text-sm text-charcoal">
            You have an unsaved session entry from earlier. Restore it?
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={restoreDraft}>
              Restore
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label>Session basics</Label>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sessionDate">Date</Label>
            <Input
              id="sessionDate"
              name="sessionDate"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="durationMinutes">Duration (minutes)</Label>
            <Input id="durationMinutes" name="durationMinutes" type="number" min={1} placeholder="45" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Setting</Label>
            <div className="flex gap-4 pt-2 text-sm text-charcoal">
              <label className="flex items-center gap-2">
                <input type="radio" name="setting" value="in_person" defaultChecked required />
                In-person
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="setting" value="virtual" />
                Virtual
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="attendance">Attendance</Label>
            <select
              id="attendance"
              name="attendance"
              className="h-9 rounded-sm border border-border bg-card px-2 text-sm"
              defaultValue="present"
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="generalPresentation">General presentation (optional)</Label>
          <Input
            id="generalPresentation"
            name="generalPresentation"
            placeholder="e.g. Regulated and engaged throughout"
          />
        </div>
      </div>

      {programme.targetBehaviours.length > 0 && (
        <div className="flex flex-col gap-3">
          <Label>Target behaviours</Label>
          {programme.targetBehaviours.map((behaviour) => (
            <div key={behaviour.id} className="flex flex-col gap-3 rounded-sm bg-card p-4 ring-1 ring-border">
              <p className="text-sm font-medium text-charcoal">
                {behaviour.label}{" "}
                <span className="text-xs font-normal text-muted-foreground">({behaviour.direction})</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`behaviour_${behaviour.id}_value`} className="text-xs">
                    {MEASUREMENT_LABEL[behaviour.measurement]}
                  </Label>
                  <Input id={`behaviour_${behaviour.id}_value`} name={`behaviour_${behaviour.id}_value`} type="number" min={0} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`behaviour_${behaviour.id}_antecedent`} className="text-xs">
                    Antecedent
                  </Label>
                  <Input id={`behaviour_${behaviour.id}_antecedent`} name={`behaviour_${behaviour.id}_antecedent`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`behaviour_${behaviour.id}_consequence`} className="text-xs">
                    Consequence
                  </Label>
                  <Input id={`behaviour_${behaviour.id}_consequence`} name={`behaviour_${behaviour.id}_consequence`} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`behaviour_${behaviour.id}_parent_label`} className="text-xs">
                  Parent-facing name (optional)
                </Label>
                <Input
                  id={`behaviour_${behaviour.id}_parent_label`}
                  name={`behaviour_${behaviour.id}_parent_label`}
                  placeholder={`How to describe "${behaviour.label}" to a parent, e.g. "leaving the activity area"`}
                  defaultValue={behaviour.parentLabel ?? ""}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <AbcObservationBuilder key={abcInitialCount} initialCount={abcInitialCount} />

      {programme.skills.length > 0 && (
        <div className="flex flex-col gap-3">
          <Label>Skills</Label>
          {programme.skills.map((skill) => (
            <div key={skill.id} className="flex flex-col gap-3 rounded-sm bg-card p-4 ring-1 ring-border">
              <p className="text-sm font-medium text-charcoal">{skill.label}</p>
              {skill.domainType ? (
                <SkillDomainFields skillId={skill.id} domainType={skill.domainType} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`skill_${skill.id}_total`} className="text-xs">
                      Trials total
                    </Label>
                    <Input id={`skill_${skill.id}_total`} name={`skill_${skill.id}_total`} type="number" min={0} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`skill_${skill.id}_correct`} className="text-xs">
                      Trials correct
                    </Label>
                    <Input id={`skill_${skill.id}_correct`} name={`skill_${skill.id}_correct`} type="number" min={0} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`skill_${skill.id}_prompt`} className="text-xs">
                      Prompt level
                    </Label>
                    <select
                      id={`skill_${skill.id}_prompt`}
                      name={`skill_${skill.id}_prompt`}
                      className="h-9 rounded-sm border border-border bg-card px-2 text-sm"
                      defaultValue=""
                    >
                      <option value="">Not recorded</option>
                      {PROMPT_LEVELS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {programme.goals.length > 0 && (
        <div className="flex flex-col gap-3">
          <Label>Goal progress</Label>
          {programme.goals.map((goal) => (
            <div key={goal.id} className="flex items-center justify-between gap-3 rounded-sm bg-card p-4 ring-1 ring-border">
              <span className="text-sm text-charcoal">{goal.title}</span>
              <div className="flex items-center gap-2">
                <Input
                  id={`goal_${goal.id}_percent`}
                  name={`goal_${goal.id}_percent`}
                  type="number"
                  min={0}
                  max={100}
                  className="w-20"
                  placeholder="0-100"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Label>Reinforcers used (optional)</Label>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
            <Input name={`reinforcer_${i}_label`} placeholder="e.g. Bubbles" />
            <select
              name={`reinforcer_${i}_effectiveness`}
              className="h-9 w-32 rounded-sm border border-border bg-card px-2 text-sm"
              defaultValue=""
            >
              <option value="">Effectiveness</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Label>Session notes</Label>
        <p className="-mt-1 text-xs text-muted-foreground">These feed the generated report -- a few short answers here go a lot further than one rushed paragraph.</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="noteArrival" className="text-xs">
            How did {childName} arrive?
          </Label>
          <Textarea id="noteArrival" name="noteArrival" rows={2} placeholder="Calm and ready to work" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="noteWin" className="text-xs">
            What was the biggest win today?
          </Label>
          <Textarea id="noteWin" name="noteWin" rows={2} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="noteHomework" className="text-xs">
            What should we practice at home?
          </Label>
          <Textarea id="noteHomework" name="noteHomework" rows={2} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="noteOther" className="text-xs">
            Anything else? (optional)
          </Label>
          <Textarea id="noteOther" name="noteOther" rows={2} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confidentialNote">Confidential note (optional)</Label>
        <Textarea id="confidentialNote" name="confidentialNote" rows={3} />
        <p className="text-xs text-muted-foreground">
          Internal only. Never shared with the parent and never sent to the report generator.
        </p>
      </div>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}

      {/* bottom-20 clears AppShell's BottomTabNav, which is also fixed
          inset-x-0 bottom-0 at z-50 on every authenticated mobile page --
          without this offset this bar rendered directly behind the tab nav,
          fully hidden, since it never had a z-index of its own to even lose
          that stacking fight visibly. md:sticky drops both the offset and
          the tab nav (desktop-only) out of the picture. */}
      <div className="fixed inset-x-0 bottom-20 z-10 border-t border-white/50 bg-[linear-gradient(180deg,rgba(250,248,246,0.82)_0%,rgba(250,248,246,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_-10px_30px_-16px_rgba(26,18,12,0.3)] backdrop-blur-2xl backdrop-saturate-150 md:sticky md:bottom-0">
        <Button type="submit" disabled={isPending} size="lg" className="mx-auto block w-full max-w-2xl">
          {isPending ? "Saving..." : "Save session"}
        </Button>
      </div>
    </form>
  );
}
