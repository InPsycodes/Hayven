# 011 — Stagger the booking/signup confirmation panel's entrance

- **Status**: DONE
- **Commit**: 0d3c9c8
- **Severity**: Delight opportunity (from `find-animation-opportunities`, not an `improve-animations` audit finding)
- **Category**: 8. Missed opportunities / Delight
- **Estimated scope**: 1 file

## Problem

```tsx
/* src/components/shared/confirmation-panel.tsx -- current, full file */
import { IconCheck } from "@tabler/icons-react";

export function ConfirmationPanel({
  heading,
  subtext,
  children,
  actions,
}: {
  heading: string;
  subtext: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center md:p-10">
      <span className="flex size-14 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
        <IconCheck size={26} stroke={2} />
      </span>
      <h1 className="font-heading text-2xl text-charcoal">{heading}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{subtext}</p>
      {children}
      {actions && <div className="mt-2 flex w-full gap-3">{actions}</div>}
    </div>
  );
}
```

This is the single most emotionally-loaded screen in the app -- it's what a parent's browser lands on immediately after paying for their child's first (or next) therapy session (`src/components/booking/booking-confirmation-content.tsx`), and what a new user sees immediately after completing signup (`src/app/(steps)/signup/complete/page.tsx`). Both are genuine "the browser just navigated here as a direct result of what I did" moments -- not a routine revisit. Right now the checkmark, heading, subtext, and detail card all appear at once, flat, indistinguishable from a settings page.

## Target

Reuse the three existing, already reduced-motion-safe utility classes from `globals.css` (`.pop-in`, `.reveal` -- both gated behind `@media (prefers-reduced-motion: no-preference)`, so no extra reduced-motion handling is needed in this component). No new CSS, no new keyframes, no new tokens -- this plan only adds class names and inline `animationDelay` staggers.

```tsx
/* target */
import { IconCheck } from "@tabler/icons-react";

export function ConfirmationPanel({
  heading,
  subtext,
  children,
  actions,
}: {
  heading: string;
  subtext: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center md:p-10">
      <span className="pop-in flex size-14 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
        <IconCheck size={26} stroke={2} />
      </span>
      <h1 className="reveal font-heading text-2xl text-charcoal" style={{ animationDelay: "80ms" }}>
        {heading}
      </h1>
      <p className="reveal max-w-sm text-sm text-muted-foreground" style={{ animationDelay: "160ms" }}>
        {subtext}
      </p>
      {children && (
        <div className="reveal w-full" style={{ animationDelay: "160ms" }}>
          {children}
        </div>
      )}
      {actions && (
        <div className="reveal mt-2 flex w-full gap-3" style={{ animationDelay: "220ms" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
```

Stagger rationale: checkmark first (no delay, it's the focal point), heading at 80ms, subtext+detail card together at 160ms (they read as one unit), actions last at 220ms (the user shouldn't be able to tap a button before they've registered what happened). Each step's own animation is 250-400ms (`.pop-in` = 250ms, `.reveal` = 400ms) so the whole sequence settles by roughly 460-620ms after mount -- comfortably within the "occasional, rare, first-time" tier's allowance for a slightly longer beat, and nowhere near long enough to feel like it's making the user wait.

## Repo conventions to follow

- `.reveal` and `.pop-in` are defined in `src/app/globals.css` inside `@layer utilities`, both `animation: <name> <duration> ease-out both`, both already gated behind `@media (prefers-reduced-motion: no-preference)` -- do not add a separate reduced-motion check in this component, the utility classes already handle it.
- `.reveal` is already used with an `animationDelay` stagger elsewhere in this codebase for a card grid entrance (`src/app/(marketing)/about/page.tsx:141`, `delayMs={i * 80}` pattern) -- this plan follows the same "stagger via inline style, not a new CSS variant" approach.
- The `children` prop (the detail-row card, e.g. therapist/child/date/amount in `booking-confirmation-content.tsx`) is optional and may be `undefined` in other future callers of `ConfirmationPanel` -- the `{children && (...)}` wrapper must not change what renders when `children` is absent, only add the animation class when it's present.

## Steps

1. Rewrite `src/components/ui/../shared/confirmation-panel.tsx` to match the Target code exactly: add `pop-in` to the icon `<span>`'s className, wrap the `<h1>`'s existing className with `reveal ` prefixed and add `style={{ animationDelay: "80ms" }}`, same pattern on the `<p>` subtext with `160ms`, wrap `children` (when present) in a new `<div className="reveal w-full" style={{ animationDelay: "160ms" }}>`, and add `reveal` + `style={{ animationDelay: "220ms" }}` to the existing `actions` wrapper `<div>` (keep its existing `mt-2 flex w-full gap-3` classes alongside `reveal`).
2. Confirm the two call sites (`booking-confirmation-content.tsx`, `signup/complete/page.tsx`) don't destructure or inspect `ConfirmationPanel`'s internal DOM structure in a way the new wrapper `<div>` around `children` would break (a quick grep/read is enough -- they only pass props, per the file already read this session).

## Boundaries

- Do NOT change `ConfirmationPanel`'s public prop shape (`heading`, `subtext`, `children`, `actions`) -- both call sites must keep working unmodified.
- Do NOT touch `booking-confirmation-content.tsx` or `signup/complete/page.tsx` themselves -- the fix is entirely inside the shared component.
- Do NOT introduce a new keyframe, utility class, or CSS custom property -- this plan exists specifically to prove the existing vocabulary (`.pop-in`, `.reveal`) is sufficient.
- Do NOT add the same treatment to the `pending` variant in `booking-confirmation-content.tsx` (the "Finalizing your payment..." state) -- that one doesn't use `ConfirmationPanel` and is out of scope for this plan.
- If `confirmation-panel.tsx`'s current content no longer matches the "Problem" excerpt above verbatim (drift since commit 0d3c9c8), STOP and report instead of rewriting over unknown changes.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**: run the dev server, go through an actual booking to `/book/[id]/confirmation` (or navigate to `/signup/complete` after a real signup). Confirm: the checkmark pops in first, the heading rises in shortly after, the detail card and subtext follow together, then the action buttons settle in last -- the whole thing should read as one confident, quick reveal, not a slideshow. Force `prefers-reduced-motion: reduce` in DevTools Rendering panel and reload -- confirm everything just appears (no animation, no missing content, nothing stuck at `opacity: 0`).
- **Done when**: both real call sites show the staggered entrance, reduced-motion users see the exact same final layout with no animation, and `npx tsc --noEmit && npx eslint .` both exit 0.
