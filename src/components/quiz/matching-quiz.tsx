"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconArrowRight,
  IconArrowsLeftRight,
  IconMapPin,
  IconVideo,
} from "@tabler/icons-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/data/format";
import { CONCERN_OPTIONS } from "@/data/concern-mapping";
import { getMatchPreview } from "@/lib/therapist/match-actions";

type MatchPreview = Awaited<ReturnType<typeof getMatchPreview>>;

const SESSION_OPTIONS = [
  {
    value: "in_person",
    label: "In person",
    hint: "You travel to their practice in Lagos",
    icon: IconMapPin,
  },
  {
    value: "virtual",
    label: "Virtual",
    hint: "Video call from home, good for busy weeks",
    icon: IconVideo,
  },
  {
    value: "no_preference",
    label: "Either is fine",
    hint: "Show me everyone",
    icon: IconArrowsLeftRight,
  },
] as const;

const BUDGET_OPTIONS = [
  { value: "15000", label: "Up to ₦15,000" },
  { value: "20000", label: "Up to ₦20,000" },
  { value: "25000", label: "Up to ₦25,000" },
  { value: "", label: "No limit: show me everyone" },
] as const;

const RAIL_NOTES = [
  "This only narrows the list. You choose who to book; nothing is scheduled or paid until you decide.",
  "Most therapists offer both formats. This just sorts the order you see them in.",
  "Prices are per session and set by each therapist. You'll always see them before you book.",
  "Not quite right? Change an answer, or adjust the filters on the next page.",
];

const STEP_META = [
  { kicker: "Step 1 of 3 · about a minute left", title: "What have you noticed about your child?", sub: "Pick the closest fit. You can change it on the results page." },
  { kicker: "Step 2 of 3", title: "How would sessions work best?", sub: "Most therapists offer both; this just sorts the order." },
  { kicker: "Step 3 of 3 · last one", title: "What works for your budget?", sub: "Per session. You can widen this later." },
];

export function MatchingQuiz() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [concern, setConcern] = useState("");
  const [sessionType, setSessionType] = useState("no_preference");
  const [budget, setBudget] = useState("");
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [isPending, startTransition] = useTransition();

  const concernOption = CONCERN_OPTIONS.find((o) => o.value === concern);
  const sessionOption = SESSION_OPTIONS.find((o) => o.value === sessionType);
  const budgetOption = BUDGET_OPTIONS.find((o) => o.value === budget);

  const searchQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (concernOption) params.set("specialty", concernOption.specialtyName);
    if (sessionType !== "no_preference") params.set("sessionType", sessionType);
    if (budget) params.set("priceMax", budget);
    return params.toString();
  }, [concernOption, sessionType, budget]);

  function runMatch(priceOverride?: number | null) {
    setPreview(null);
    startTransition(async () => {
      const result = await getMatchPreview({
        specialtyName: concernOption?.specialtyName,
        sessionType: sessionType === "no_preference" ? undefined : (sessionType as "in_person" | "virtual"),
        priceMax: priceOverride === null ? undefined : priceOverride ?? (budget ? Number(budget) : undefined),
      });
      setPreview(result);
    });
  }

  function goNext() {
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setStep(3);
    runMatch();
  }

  function goBack() {
    if (step === 0) {
      router.push("/");
      return;
    }
    setStep((s) => Math.max(0, Math.min(s, 3) - 1));
  }

  function widenBudget() {
    setBudget("");
    runMatch(null);
  }

  const filledSegments = step === 3 ? 3 : step + 1;
  const railNote = RAIL_NOTES[Math.min(step, 3)];
  const canAdvance = step !== 0 || Boolean(concern);

  return (
    <div className="grid min-h-[calc(100dvh-var(--pwa-reserve,0px))] grid-rows-[auto_1fr] md:grid-cols-[minmax(0,320px)_1fr] md:grid-rows-[1fr]">
      {/* Rail */}
      <aside className="flex flex-col gap-5 bg-charcoal px-5 py-5 text-offwhite md:gap-7 md:px-7 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <Link href="/" aria-label="Hayven home">
            <BrandMark />
          </Link>
          <span className="label-micro text-offwhite/45 md:hidden">
            {step === 3 ? "Results" : `Step ${step + 1} of 3`}
          </span>
        </div>

        <p className="label-micro hidden text-offwhite/45 md:block">Matching quiz</p>

        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-[3px] flex-1 rounded-full transition-colors",
                i < filledSegments ? "bg-rust-light" : "bg-white/15"
              )}
            />
          ))}
        </div>

        <div className="hidden flex-col gap-2.5 md:flex">
          <RailAnswer label="Concern" value={concernOption?.label ?? null} />
          <RailAnswer
            label="Sessions"
            value={step > 1 || step === 3 ? sessionOption?.label ?? null : null}
          />
          <RailAnswer
            label="Budget"
            value={step > 2 || step === 3 ? budgetOption?.label ?? null : null}
          />
        </div>

        <p className="mt-auto hidden text-xs leading-relaxed text-offwhite/55 md:block">{railNote}</p>
      </aside>

      {/* Panel */}
      <section className="flex flex-col bg-paper px-5 py-7 md:px-10 md:py-10">
        <div key={step} className="flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
          {step < 3 ? (
            <>
              <div className="flex flex-1 flex-col justify-center py-4">
              <span className="label-micro text-ink-soft">{STEP_META[step].kicker}</span>
              <h1 className="mt-2 max-w-[22ch] font-serif text-2xl leading-tight text-charcoal md:text-[1.7rem]">
                {STEP_META[step].title}
              </h1>
              <p className="mt-1.5 text-sm text-ink-soft">{STEP_META[step].sub}</p>

              <div
                role="radiogroup"
                aria-label={STEP_META[step].title}
                className="mt-6"
              >
                {step === 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CONCERN_OPTIONS.map((option) => (
                      <OptionCard
                        key={option.value}
                        selected={concern === option.value}
                        onSelect={() => setConcern(option.value)}
                        className={option.value === "unsure" ? "sm:col-span-2" : ""}
                      >
                        {option.label}
                      </OptionCard>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-2.5">
                    {SESSION_OPTIONS.map((option) => (
                      <OptionCard
                        key={option.value}
                        selected={sessionType === option.value}
                        onSelect={() => setSessionType(option.value)}
                        icon={option.icon}
                        hint={option.hint}
                      >
                        {option.label}
                      </OptionCard>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-2.5">
                    {BUDGET_OPTIONS.map((option) => (
                      <OptionCard
                        key={option.value || "any"}
                        selected={budget === option.value}
                        onSelect={() => setBudget(option.value)}
                      >
                        {option.label}
                      </OptionCard>
                    ))}
                  </div>
                )}
              </div>
              </div>

              <Footer
                onBack={goBack}
                backLabel={step === 0 ? "Back to home" : "Back"}
                onNext={goNext}
                nextLabel={step === 2 ? "See my matches" : "Continue"}
                nextDisabled={!canAdvance}
              />
            </>
          ) : (
            <ResultsStep
              isPending={isPending}
              preview={preview}
              specialtyLabel={concernOption?.specialtyName ?? "the right specialists"}
              budgetLabel={budget ? budgetOption?.label : null}
              sessionLabel={sessionType === "no_preference" ? null : sessionOption?.label ?? null}
              onBack={() => setStep(0)}
              onWiden={widenBudget}
              canWiden={Boolean(budget)}
              onSeeMatches={() => router.push(`/search?${searchQuery}`)}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function RailAnswer({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline gap-2 text-[11px]">
      <span className="w-16 shrink-0 text-offwhite/40">{label}</span>
      <span className={cn("min-w-0 truncate", value ? "text-offwhite" : "text-offwhite/30")}>
        {value ?? "Not yet"}
      </span>
    </div>
  );
}

function OptionCard({
  selected,
  onSelect,
  children,
  hint,
  icon,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  hint?: string;
  icon?: React.ComponentProps<typeof Icon>["icon"];
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-canvas-white px-3.5 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40",
        selected
          ? "border-terracotta bg-terracotta/[0.06] text-charcoal"
          : "border-charcoal/12 text-charcoal hover:border-charcoal/30",
        className
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            selected ? "bg-terracotta/12 text-rust-dark" : "bg-paper text-ink-soft"
          )}
        >
          <Icon icon={icon} size="sm" />
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-terracotta" : "border-charcoal/25"
          )}
        >
          {selected && <span className="size-2 rounded-full bg-terracotta" />}
        </span>
      )}
      <span className="min-w-0">
        <span className="block leading-snug">{children}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>}
      </span>
    </button>
  );
}

function Footer({
  onBack,
  backLabel,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack: () => void;
  backLabel: string;
  onNext: () => void;
  nextLabel: string;
  nextDisabled: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-charcoal"
      >
        <IconArrowLeft size={15} stroke={2} />
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
          nextDisabled
            ? "cursor-not-allowed bg-charcoal/10 text-ink-soft"
            : "bg-terracotta-fill text-white hover:bg-rust-dark"
        )}
      >
        {nextLabel}
        <IconArrowRight size={15} stroke={2} />
      </button>
    </div>
  );
}

function ResultsStep({
  isPending,
  preview,
  specialtyLabel,
  budgetLabel,
  sessionLabel,
  onBack,
  onWiden,
  canWiden,
  onSeeMatches,
}: {
  isPending: boolean;
  preview: MatchPreview | null;
  specialtyLabel: string;
  budgetLabel: string | null | undefined;
  sessionLabel: string | null;
  onBack: () => void;
  onWiden: () => void;
  canWiden: boolean;
  onSeeMatches: () => void;
}) {
  const loading = isPending || !preview;
  const zero = !loading && preview.count === 0;

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <span className="label-micro text-ink-soft">Based on your answers</span>

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-8 w-3/4 animate-pulse rounded bg-charcoal/10" />
          <div className="h-8 w-2/5 animate-pulse rounded bg-charcoal/10" />
          <div className="mt-2 flex gap-2.5">
            <div className="h-16 flex-1 animate-pulse rounded-xl bg-charcoal/10" />
            <div className="h-16 flex-1 animate-pulse rounded-xl bg-charcoal/10" />
          </div>
        </div>
      ) : zero ? (
        <>
          <h1 className="max-w-[24ch] font-serif text-2xl leading-tight text-charcoal md:text-[1.7rem]">
            Nothing matched all three filters.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            {canWiden
              ? "Your budget is the tightest filter here. Widen it, or browse everyone and set your own filters."
              : "Try browsing the full list and adjusting the filters there."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {canWiden && (
              <button
                type="button"
                onClick={onWiden}
                className="inline-flex items-center gap-2 rounded-lg bg-terracotta-fill px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
              >
                Remove the budget limit
              </button>
            )}
            <button
              type="button"
              onClick={onSeeMatches}
              className="inline-flex items-center rounded-lg border border-rust-dark/40 px-5 py-2.5 text-sm font-semibold text-rust-dark transition-colors hover:bg-rust-dark hover:text-canvas-white"
            >
              Browse all therapists
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="max-w-[26ch] font-serif text-2xl leading-tight text-charcoal md:text-[1.75rem]">
            We found {preview.count} verified therapist{preview.count === 1 ? "" : "s"} who fit, mostly in{" "}
            {specialtyLabel.toLowerCase()}.
          </h1>

          <div className="flex flex-wrap gap-2">
            <ResultTag>{specialtyLabel}</ResultTag>
            {sessionLabel && <ResultTag>{sessionLabel}</ResultTag>}
            {budgetLabel && <ResultTag>{budgetLabel}</ResultTag>}
          </div>

          {preview.preview.length > 0 && (
            <div className="mt-1 flex flex-col gap-2.5 sm:flex-row">
              {preview.preview.map((t) => (
                <div
                  key={t.displayName}
                  className="flex-1 rounded-xl bg-charcoal p-3.5 text-canvas-white"
                >
                  <p className="font-serif text-sm">{t.displayName}</p>
                  <p className="mt-1 text-[11px] text-canvas-white/55">
                    {[
                      t.location,
                      t.yearsPracticing ? `${t.yearsPracticing} yrs` : null,
                      formatNaira(t.pricePerSession),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-charcoal"
            >
              <IconArrowLeft size={15} stroke={2} />
              Change an answer
            </button>
            <button
              type="button"
              onClick={onSeeMatches}
              className="inline-flex items-center gap-2 rounded-lg bg-terracotta-fill px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
            >
              See {preview.count === 1 ? "the match" : `all ${preview.count} matches`}
              <IconArrowRight size={15} stroke={2} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ResultTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-canvas-white px-2.5 py-1 text-xs text-ink-soft ring-1 ring-charcoal/10">
      {children}
    </span>
  );
}
