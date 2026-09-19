# 014 — Give the PWA install prompt an entrance instead of teleporting in

- **Status**: TODO
- **Commit**: 5b580d0
- **Severity**: LOW-MEDIUM
- **Category**: 8. Missed opportunities (+ 4. Interruptibility)
- **Estimated scope**: 1 file

## Problem

```tsx
/* src/components/shared/pwa-install-prompt.tsx:144-164 — current */
if (!showing) return null;

return (
  <div
    role="complementary"
    aria-label="Install Hayven"
    className="fixed inset-x-4 bottom-20 z-40 ml-auto flex max-w-[240px] items-center gap-2.5 rounded-sm border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,26,0.9)_0%,rgba(26,26,26,0.82)_100%)] px-3.5 py-2.5 text-offwhite shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_-16px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150 md:bottom-4 md:inset-x-auto md:right-4 md:z-50 md:max-w-sm"
  >
```

This is a `fixed`, bottom-anchored, toast-shaped element (the component's own surrounding comments call it exactly that context: a floating install nudge shown after a delay on non-critical pages). It mounts via a bare `{!showing) return null}` gate with zero transition — it simply appears mid-page after its delay timer fires, and disappears instantly on dismiss/install. This is the "occasional, appears after a delay" frequency tier (roughly toast/banner cadence), which AUDIT.md's frequency table puts in the "Standard animation" band, not "no animation."

## Target

Give it a short rise-in matching where it's anchored (from below, since it's bottom-pinned), reusing the existing `.reveal` utility already used elsewhere in this codebase for exactly this kind of appearing panel (plan 011, `confirmation-panel.tsx`):

```tsx
/* target */
<div
  role="complementary"
  aria-label="Install Hayven"
  className="reveal fixed inset-x-4 bottom-20 z-40 ml-auto flex max-w-[240px] items-center gap-2.5 rounded-sm border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,26,0.9)_0%,rgba(26,26,26,0.82)_100%)] px-3.5 py-2.5 text-offwhite shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_-16px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150 md:bottom-4 md:inset-x-auto md:right-4 md:z-50 md:max-w-sm"
>
```

`.reveal` is `animation: rise 0.4s ease-out both;` (`globals.css:423-425`), already reduced-motion-gated inside the `@media (prefers-reduced-motion: no-preference)` block. Only the `reveal` class is added, prepended to the existing class list — no other class, structure, or logic changes.

## Repo conventions to follow

- Exemplar: `src/components/shared/confirmation-panel.tsx` (plan 011) — same `.reveal` class added to a panel that previously teleported into view, no other changes needed to get the entrance.
- This plan is entrance-only, matching precedent (plans 011/012 were also entrance-only). Exit (on dismiss/install) is explicitly out of scope — see Boundaries.

## Steps

1. In `src/components/shared/pwa-install-prompt.tsx`, add `reveal` as the first class in the `className` string on the `<div role="complementary" ...>` element (around line 163), before `fixed`. Do not reorder or remove any existing class.

## Boundaries

- Do NOT add an exit animation — that requires delaying the `{!showing) return null}` unmount (e.g. a local "closing" state plus a timeout matching the animation duration), which is a larger behavioral change than this plan's scope. If exit animation is wanted later, it should be its own plan.
- Do NOT touch `dismiss()`, `install()`, the `isCriticalFlow` exclusion logic, or the space-reservation CSS (`--pwa-reserve`) referenced in the surrounding comments.
- Do NOT change the component's positioning, sizing, or the iOS/Android branch content.
- If the current file no longer matches the "Problem" excerpt above verbatim (drift since commit 5b580d0), STOP and report instead of rewriting over unknown changes.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**:
  - Trigger the prompt (its delay timer, or by whatever manual trigger the codebase already uses for testing it) on a non-critical page and confirm it rises in from its resting position rather than snapping into existence.
  - In DevTools, set Animations panel playback to 10% and confirm the motion is a simple rise (translateY + opacity), not a bounce or scale.
  - Toggle `prefers-reduced-motion: reduce` (Rendering panel) and confirm the prompt still appears (just without perceptible motion) rather than staying hidden.
- **Done when**: the prompt visibly rises in on first appearance, and `npx tsc --noEmit && npx eslint .` both exit 0.
