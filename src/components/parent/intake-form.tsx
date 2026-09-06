"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconLock } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { RealIntakeForm } from "@/lib/intake/queries";
import { saveIntakeForm, recordIntakeConsent } from "@/lib/intake/actions";
import {
  CONSENT_COPY,
  CONSENT_TYPES,
  INTAKE_SECTIONS,
  intakeProgress,
  type ConsentState,
  type ConsentType,
  type IntakeDetails,
  type IntakeField,
  type SectionState,
} from "@/lib/intake/schema";

const STATE_BADGE: Record<SectionState, { tone: "sage" | "amber" | "grey"; label: string }> = {
  complete: { tone: "sage", label: "Complete" },
  in_progress: { tone: "amber", label: "In progress" },
  not_started: { tone: "grey", label: "Not started" },
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 45_000) return "just now";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString();
}

export function IntakeForm({
  childId,
  childName,
  initial,
}: {
  childId: string;
  childName: string;
  initial: RealIntakeForm | null;
}) {
  const router = useRouter();
  const [details, setDetails] = useState<IntakeDetails>(initial?.details ?? {});
  const [consents, setConsents] = useState<ConsentState[]>(
    initial?.consents ??
      CONSENT_TYPES.map((type) => ({ type, granted: false, detail: null, recordedAt: null }))
  );
  const [savedAt, setSavedAt] = useState<string | null>(
    initial && initial.updatedAt !== new Date(0).toISOString() ? initial.updatedAt : null
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [tick, setTick] = useState(0); // re-render the "saved N min ago" label

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  void tick;

  const progress = intakeProgress(details, consents, childName);

  // --- debounced autosave of `details` ---
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(details);
  useEffect(() => {
    latest.current = details;
  });

  const flush = useCallback(async () => {
    setStatus("saving");
    const result = await saveIntakeForm(childId, latest.current as Record<string, unknown>);
    if (result.ok) {
      setStatus("saved");
      setSavedAt(new Date().toISOString());
      router.refresh();
    } else {
      setStatus("error");
    }
  }, [childId, router]);

  function update<K extends keyof IntakeDetails>(key: K, value: IntakeDetails[K]) {
    setDetails((prev) => {
      const next = { ...prev };
      if (value == null || (Array.isArray(value) && value.length === 0) || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function toggleConsent(type: ConsentType, granted: boolean, detail?: string) {
    setConsents((prev) => prev.map((c) => (c.type === type ? { ...c, granted, detail: detail ?? c.detail } : c)));
    setStatus("saving");
    const result = await recordIntakeConsent(childId, type, granted, detail);
    if (result.ok) {
      setStatus("saved");
      setConsents((prev) =>
        prev.map((c) => (c.type === type ? { ...c, recordedAt: new Date().toISOString() } : c))
      );
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* progress header */}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-care-ink-soft">
          This stays with {childName}&apos;s file so their therapist walks into the first session
          already knowing them. Fill in what you can now and come back to the rest. It saves as you go.
        </p>
        <div className="rounded-lg border border-care-line bg-care-surface px-4 py-3">
          <div className="flex items-center justify-between gap-4 text-[13px]">
            <span className="font-medium text-care-ink">
              {progress.started} of {progress.total} sections started
            </span>
            <span className="text-care-ink-faint tabular-nums">
              {progress.complete} complete
              {status === "saving" && " · saving…"}
              {status === "saved" && savedAt && ` · saved ${relativeTime(savedAt)}`}
              {status === "error" && " · couldn't save, check your connection"}
            </span>
          </div>
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-care-line">
            <div
              className="h-full rounded-full bg-care-accent transition-[width] duration-300"
              style={{ width: `${Math.round((progress.started / progress.total) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg border border-care-line bg-care-surface px-4 py-3 text-[13px] text-care-ink-soft">
          <IconLock size={15} stroke={1.75} className="mt-0.5 shrink-0 text-care-sage" />
          <span>
            Only {childName}&apos;s <span className="font-medium text-care-ink">assigned therapist</span> and
            Hayven&apos;s care team can see this. It is never shown publicly, and you can change any answer at
            any time.
          </span>
        </div>
      </div>

      {INTAKE_SECTIONS.map((section, i) => {
        const state = progress.sections[i].state;
        const badge = STATE_BADGE[state];
        const title = section.title.replace(/\{child\}/g, childName);
        const why = section.why.replace(/\{child\}/g, childName);
        return (
          <section key={section.id} className="flex flex-col gap-1 border-t border-care-line pt-6 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                <span className="font-serif text-[13px] text-care-ink-faint tabular-nums">{i + 1}</span>
                <h2 className="font-serif text-[17px] text-care-ink">{title}</h2>
              </div>
              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            </div>
            <p className="max-w-[58ch] text-xs text-care-ink-faint">{why}</p>

            {section.consent ? (
              <ConsentBlock consents={consents} onToggle={toggleConsent} childName={childName} />
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {section.fields.map((field) => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    childName={childName}
                    value={details[field.key]}
                    onChange={(v) => update(field.key, v as IntakeDetails[typeof field.key])}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-3 border-t border-care-line pt-6">
        <Button type="button" variant="accent" onClick={flush} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save intake form"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/parent")}>
          Save &amp; finish later
        </Button>
        <span className="ml-auto text-xs text-care-ink-faint">
          {savedAt ? `Last saved ${relativeTime(savedAt)}` : "Not saved yet"} · auto-saves as you type
        </span>
      </div>
    </div>
  );
}

// --- field control -------------------------------------------------------

function FieldControl({
  field,
  childName,
  value,
  onChange,
}: {
  field: IntakeField;
  childName: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = field.label.replace(/\{child\}/g, childName);
  const id = `intake-${field.key}`;

  if (field.kind === "chips") {
    const options = field.options as readonly string[];
    const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-care-ink">
          {label}
          {field.hint && <span className="ml-2 font-normal text-care-ink-faint">({field.hint})</span>}
        </span>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const on = selected.has(opt);
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = new Set(selected);
                  if (on) next.delete(opt);
                  else next.add(opt);
                  onChange([...next]);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                  on
                    ? "border-care-accent/55 bg-care-accent/15 font-medium text-care-ink"
                    : "border-care-line bg-care-raised text-care-ink-soft hover:border-care-ink-faint/50 hover:text-care-ink"
                )}
              >
                {on && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-care-accent align-middle" />}
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.kind === "segmented") {
    const options = field.options as { value: string; label: string }[];
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-care-ink">{label}</span>
        <div className="flex flex-wrap gap-1 self-start rounded-lg border border-care-line bg-care-raised p-[3px]">
          {options.map((opt) => {
            const on = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? "" : opt.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] transition-colors",
                  on ? "bg-care-accent font-medium text-white" : "text-care-ink-soft hover:text-care-ink"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.kind === "textarea") {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          rows={3}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="h-9"
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// --- consent block ------------------------------------------------------

function ConsentBlock({
  consents,
  onToggle,
  childName,
}: {
  consents: ConsentState[];
  onToggle: (type: ConsentType, granted: boolean, detail?: string) => void;
  childName: string;
}) {
  return (
    <div className="mt-4 flex flex-col">
      {CONSENT_TYPES.map((type, i) => {
        const copy = CONSENT_COPY[type];
        const state = consents.find((c) => c.type === type)!;
        return (
          <div
            key={type}
            className={cn("flex items-start gap-3 py-3", i > 0 && "border-t border-care-line")}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={state.granted}
              aria-label={copy.title.replace(/\{child\}/g, childName)}
              onClick={() => onToggle(type, !state.granted, state.detail ?? undefined)}
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                state.granted ? "border-care-accent bg-care-accent" : "border-care-ink-faint/50 bg-care-raised"
              )}
            >
              {state.granted && <IconCheck size={13} stroke={3} className="text-white" />}
            </button>
            <div className="text-[13.5px]">
              <div className="font-medium text-care-ink">
                {copy.title.replace(/\{child\}/g, childName)}
                {copy.required && <span className="ml-2 text-[11px] font-semibold tracking-wide text-care-amber">REQUIRED</span>}
              </div>
              {copy.sub && (
                <p className="mt-0.5 text-[12.5px] text-care-ink-faint">
                  {copy.sub.replace(/\{child\}/g, childName)}
                </p>
              )}
              {copy.hasDetail && state.granted && (
                <Input
                  className="mt-2 h-9"
                  defaultValue={state.detail ?? ""}
                  placeholder={copy.detailPlaceholder}
                  aria-label="People to share updates with"
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next !== (state.detail ?? "").trim()) onToggle(type, true, next);
                  }}
                />
              )}
              {state.recordedAt && (
                <p className="mt-1.5 text-[11px] text-care-ink-faint">
                  Recorded {new Date(state.recordedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
      <p className="mt-3 text-[12px] text-care-ink-faint">
        We record the date and time you agree to each of these, and keep a history if you change them.
      </p>
    </div>
  );
}
