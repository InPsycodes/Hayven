import { IconCheck, IconX } from "@tabler/icons-react";

import { StatusBadge } from "@/components/ui/status-badge";
import type { RealIntakeForm } from "@/lib/intake/queries";
import {
  CONSENT_COPY,
  CONSENT_TYPES,
  INTAKE_SECTIONS,
  intakeProgress,
  sectionState,
  type IntakeField,
  type SectionState,
} from "@/lib/intake/schema";

const STATE_BADGE: Record<SectionState, { tone: "sage" | "amber" | "grey"; label: string }> = {
  complete: { tone: "sage", label: "Complete" },
  in_progress: { tone: "amber", label: "In progress" },
  not_started: { tone: "grey", label: "Not started" },
};

function formatValue(field: IntakeField, value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (typeof value !== "string" || !value.trim()) return null;
  if (field.kind === "segmented" && Array.isArray(field.options)) {
    const match = (field.options as { value: string; label: string }[]).find((o) => o.value === value);
    return match ? match.label : value;
  }
  return value;
}

export function IntakeFormView({ childName, form }: { childName: string; form: RealIntakeForm | null }) {
  if (!form) {
    return (
      <p className="rounded-lg border border-care-line bg-care-surface p-4 text-sm text-care-ink-soft">
        {childName}&apos;s parent hasn&apos;t started an intake form yet.
      </p>
    );
  }

  const { details, consents } = form;
  const progress = intakeProgress(details, consents, childName);
  const accessConsent = consents.find((c) => c.type === "therapist_access");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-care-line bg-care-surface px-4 py-3 text-[13px]">
        <span className="font-medium text-care-ink">
          {progress.complete} of {progress.total} sections complete
        </span>
        <span className="text-care-ink-faint">
          {form.updatedAt !== new Date(0).toISOString()
            ? `Last updated ${new Date(form.updatedAt).toLocaleDateString()}`
            : "Consent recorded, form not started"}
        </span>
      </div>

      {!accessConsent?.granted && (
        <p className="rounded-lg border border-care-amber/30 bg-care-amber/10 px-4 py-3 text-[13px] text-care-ink">
          The parent has not yet agreed to let the assigned therapist read this form. Treat what follows as
          incomplete until that consent is recorded.
        </p>
      )}

      {INTAKE_SECTIONS.map((section, i) => {
        const title = section.title.replace(/\{child\}/g, childName);

        if (section.consent) {
          return (
            <section key={section.id} className="border-t border-care-line pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-[16px] text-care-ink">
                  <span className="mr-2 text-[13px] text-care-ink-faint tabular-nums">{i + 1}</span>
                  {title}
                </h3>
              </div>
              <ul className="mt-3 flex flex-col gap-2.5">
                {CONSENT_TYPES.map((type) => {
                  const state = consents.find((c) => c.type === type)!;
                  const copy = CONSENT_COPY[type];
                  return (
                    <li key={type} className="flex items-start gap-2.5 text-[13px]">
                      {state.granted ? (
                        <IconCheck size={15} stroke={2.5} className="mt-0.5 shrink-0 text-care-sage" />
                      ) : (
                        <IconX size={15} stroke={2.5} className="mt-0.5 shrink-0 text-care-ink-faint" />
                      )}
                      <span className={state.granted ? "text-care-ink" : "text-care-ink-faint"}>
                        {copy.title.replace(/\{child\}/g, childName)}
                        {state.detail && <span className="block text-care-ink-soft">Share with: {state.detail}</span>}
                        {state.recordedAt && (
                          <span className="block text-[11px] text-care-ink-faint">
                            {new Date(state.recordedAt).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        }

        const state = sectionState(section, details, consents);
        const badge = STATE_BADGE[state];
        const rows = section.fields
          .map((f) => ({ label: f.label.replace(/\{child\}/g, childName), value: formatValue(f, details[f.key]) }))
          .filter((r) => r.value !== null);

        return (
          <section key={section.id} className="border-t border-care-line pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-[16px] text-care-ink">
                <span className="mr-2 text-[13px] text-care-ink-faint tabular-nums">{i + 1}</span>
                {title}
              </h3>
              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            </div>
            {rows.length === 0 ? (
              <p className="mt-2 text-[13px] text-care-ink-faint">Nothing shared for this section yet.</p>
            ) : (
              <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,180px)_1fr]">
                {rows.map((r) => (
                  <div key={r.label} className="contents">
                    <dt className="text-[13px] text-care-ink-faint">{r.label}</dt>
                    <dd className="text-[13.5px] leading-relaxed text-care-ink whitespace-pre-line">{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}
