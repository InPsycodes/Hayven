# 010 — Gate Trust & Safety card hover behind `(hover: hover)` and add a tap fallback

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: MEDIUM
- **Category**: 6. Accessibility
- **Estimated scope**: 1 file

## Problem

```tsx
/* src/components/marketing/trust-safety.tsx — current, full file */
import { TRUST_SAFETY_POINTS } from "@/content/marketing/trust-safety";
import { Icon } from "@/components/ui/icon";

export function TrustSafety() {
  return (
    <section className="px-6 py-16 sm:py-20 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-rust-dark">Trust &amp; safety</span>
          <h2 className="mt-3 font-serif text-[1.7rem] leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Care you can trust.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            You&apos;re trusting Hayven with your child&apos;s care and your family&apos;s
            information. Here&apos;s what actually stands behind that trust.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-3">
          {TRUST_SAFETY_POINTS.map((point) => (
            <div key={point.title} className="h-full">
              {/* Title and body are stacked in the same grid cell (both
                  col/row-start-1), so the cell auto-sizes to whichever is
                  taller at any card width -- no fixed-height guess needed.
                  The title fades out and the body fades in on hover, so the
                  card's footprint never changes and no sibling card shifts. */}
              <div className="group relative flex h-full scale-100 flex-col items-center gap-4 rounded-[1.25rem] border-[1.5px] border-terracotta/70 bg-canvas-white p-8 text-center shadow-[0_10px_30px_-16px_rgba(26,18,12,0.22),0_0_40px_-16px_rgba(156,89,52,0.25)] transition-all duration-300 ease-out hover:z-20 hover:scale-[1.04] hover:border-terracotta hover:shadow-[0_14px_36px_-16px_rgba(26,18,12,0.26),0_0_48px_-14px_rgba(156,89,52,0.32)]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-terracotta/25 bg-terracotta/12 text-terracotta">
                  <Icon icon={point.icon} size="md" />
                </span>

                <div className="grid justify-items-center">
                  <h3 className="col-start-1 row-start-1 self-start font-serif text-lg text-charcoal transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-0">
                    {point.title}
                  </h3>
                  <p className="col-start-1 row-start-1 translate-y-1 self-start text-sm leading-relaxed text-ink-soft opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                    {point.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

The title-to-body reveal is driven entirely by `group-hover:` with no touch/tap fallback and no `(hover: hover)` gate. On a touch device, tapping the card triggers CSS `:hover` (which persists, often "sticky," until the user taps elsewhere) — the title can be left invisible (`opacity-0`) with the body shown, and there's no deliberate tap-to-toggle affordance, so a touch user can land in that state without a clear way to intentionally get back to the title, and the card gives no visual signal that it's tappable at all (no cursor affordance equivalent on touch). This plan is also scope 5's `transition-all` finding on the same three elements (card, title, body) — folded into this plan since fixing the interaction model requires touching the same class strings anyway (see plan-authoring note: "if two findings share every file and the same fix pattern, they may merge into one").

## Target

Two changes, same file:

1. Gate the hover-driven transform/reveal behind `@media (hover: hover) and (pointer: fine)` so touch devices never enter the ambiguous hover-stuck state — implemented via Tailwind's `hover:` variant already being pointer-aware in modern Tailwind (v4's `hover:` utilities compile to `@media (hover: hover) { &:hover { ... } }` by default), so no change is needed to *gate* it — Tailwind v4 already does this. The actual problem is the *lack of a tap-based alternative*, not a missing gate (verify this during Step 1 rather than assuming — see the note in Steps).
2. Add a click-to-toggle affordance for touch/keyboard users: track which card (if any) is "revealed" via a `useState<number | null>`, toggle it on click, and drive the reveal via a data attribute instead of (or in addition to) `group-hover:`, so tapping a card explicitly shows its body and tapping again (or tapping elsewhere) returns to the title — never a stuck ambiguous state. Also scope `transition-all` on the card, title, and body down to the properties each actually changes, matching plan 002's pattern.

```tsx
/* target */
"use client";

import { useState } from "react";

import { TRUST_SAFETY_POINTS } from "@/content/marketing/trust-safety";
import { Icon } from "@/components/ui/icon";

export function TrustSafety() {
  const [revealed, setRevealed] = useState<number | null>(null);

  return (
    <section className="px-6 py-16 sm:py-20 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-rust-dark">Trust &amp; safety</span>
          <h2 className="mt-3 font-serif text-[1.7rem] leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Care you can trust.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            You&apos;re trusting Hayven with your child&apos;s care and your family&apos;s
            information. Here&apos;s what actually stands behind that trust.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-3">
          {TRUST_SAFETY_POINTS.map((point, i) => (
            <div key={point.title} className="h-full">
              <button
                type="button"
                onClick={() => setRevealed((current) => (current === i ? null : i))}
                data-revealed={revealed === i}
                className="group relative flex h-full w-full scale-100 flex-col items-center gap-4 rounded-[1.25rem] border-[1.5px] border-terracotta/70 bg-canvas-white p-8 text-center shadow-[0_10px_30px_-16px_rgba(26,18,12,0.22),0_0_40px_-16px_rgba(156,89,52,0.25)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:z-20 hover:scale-[1.04] hover:border-terracotta hover:shadow-[0_14px_36px_-16px_rgba(26,18,12,0.26),0_0_48px_-14px_rgba(156,89,52,0.32)] data-[revealed=true]:z-20 data-[revealed=true]:scale-[1.04] data-[revealed=true]:border-terracotta data-[revealed=true]:shadow-[0_14px_36px_-16px_rgba(26,18,12,0.26),0_0_48px_-14px_rgba(156,89,52,0.32)]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-terracotta/25 bg-terracotta/12 text-terracotta">
                  <Icon icon={point.icon} size="md" />
                </span>

                <div className="grid justify-items-center">
                  <h3 className="col-start-1 row-start-1 self-start font-serif text-lg text-charcoal transition-[transform,opacity] duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-0 group-data-[revealed=true]:-translate-y-1 group-data-[revealed=true]:opacity-0">
                    {point.title}
                  </h3>
                  <p className="col-start-1 row-start-1 translate-y-1 self-start text-sm leading-relaxed text-ink-soft opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-data-[revealed=true]:translate-y-0 group-data-[revealed=true]:opacity-100">
                    {point.body}
                  </p>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

## Repo conventions to follow

- Tailwind v4's `hover:` variant already compiles to a `(hover: hover)`-gated media query by default (unlike Tailwind v3, which needed a manual `@media (hover: hover)` plugin) — no change needed to add that gate for the mouse-hover path; it already only fires on hover-capable pointers. Confirm this holds for this project's actual Tailwind version during Step 1 rather than assuming.
- The `<div className="group ...">` becomes a `<button type="button" className="group ...">` so it's keyboard-focusable and touch-tappable with correct semantics — matches this component's role as an interactive reveal, not a static card. This is the one markup-structure change in this plan; every other plan in this set is styling-only, but this finding's root cause (no tap affordance) cannot be fixed with styling alone.
- `group-data-[revealed=true]:` is standard Tailwind arbitrary-data-attribute variant syntax, matching this codebase's existing `data-active:`/`data-open:` usage pattern (see `tabs.tsx:68`, `popover.tsx:33`).

## Steps

1. Before editing, run `grep -n "\"tailwindcss\"" package.json` to confirm the installed Tailwind major version is 4.x (already established as `^4` throughout this codebase per prior sessions, but confirm before relying on `hover:`'s default `(hover: hover)` gating behavior).
2. Rewrite `src/components/marketing/trust-safety.tsx` to match the Target code exactly: add `"use client";` at the top (required for `useState`), import `useState` from `"react"`, add the `revealed` state, change the `.map((point) => ...)` to `.map((point, i) => ...)`, replace the inner `<div className="group ...">` with a `<button type="button" onClick={...} data-revealed={...} className="group ...">` using the scoped `transition-[transform,border-color,box-shadow]` (not `transition-all`), and change the title/body's `group-hover:` classes to also respond to `group-data-[revealed=true]:` with the matching scoped `transition-[transform,opacity]`.
3. Keep the existing code comment about the grid-cell stacking technique (it's still accurate and still the reason the layout doesn't shift) — move it above the new `<button>` if its position needs to shift, don't delete it.

## Boundaries

- Do NOT change `TRUST_SAFETY_POINTS`' content or the `Icon` component.
- Do NOT change the section's outer layout (grid columns, spacing, heading).
- Do NOT remove the hover behavior for mouse/trackpad users — both hover and tap must work after this change (a mouse user should still see the reveal on hover, without needing to click).
- Do NOT let two cards be revealed simultaneously — `revealed` is a single `number | null`, tapping a new card should close whichever was previously open.
- If the file's current content no longer matches the "Problem" excerpt above verbatim (drift since commit a8aaf2a), STOP and report instead of rewriting over unknown changes.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean — pay particular attention to any `jsx-a11y` lint rule about interactive elements (a `<button>` wrapping other interactive-looking content should be fine here since nothing inside it is itself a link/button, but let the linter confirm).
- **Feel check**: run the dev server at both a desktop and a mobile/touch viewport (DevTools device toolbar, with touch simulation enabled).
  - Desktop: hover each card, confirm the title fades out and body fades in exactly as before, and un-hovering reverts it.
  - Touch (DevTools touch simulation or a real device): tap a card, confirm the body reveals; tap the same card again, confirm it reverts to the title; tap a different card, confirm the first one closes and the new one opens.
  - Keyboard: Tab to a card, press Enter/Space, confirm the same toggle behavior as a tap.
  - Confirm no card can ever get stuck showing only its body with no way to get back to the title.
- **Done when**: hover, tap, and keyboard all correctly toggle the reveal with no stuck states, `transition-all` is gone from all three elements in this file, and `npx tsc --noEmit && npx eslint .` both exit 0.
