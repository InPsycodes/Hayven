# 006 — Give FieldError a mount-safe transition instead of a hard unmount

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: MEDIUM
- **Category**: 4. Interruptibility (+ 8. Missed opportunities)
- **Estimated scope**: 1 file

## Problem

```tsx
/* src/components/ui/field-error.tsx — current, full file */
import { IconAlertCircle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export function FieldError({
  id,
  children,
  className,
}: {
  id: string;
  children?: string | null;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p id={id} className={cn("flex items-start gap-1 text-xs text-error-text", className)}>
      <IconAlertCircle size={13} stroke={2} aria-hidden className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}
```

Used under nearly every form field in the app (`login-form.tsx`, `signup-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, and others). It returns `null` when there's no message and a `<p>` when there is — every validation error appears/disappears as a hard layout jump, and because it's rapidly retriggerable (an error can appear, get fixed, reappear as the user types), a plain mount/unmount restarts any CSS `@keyframes`-based entrance from zero rather than retargeting smoothly. There is currently no animation at all, so there's nothing to retarget — the fix has to both add motion and make it interruption-safe from the start.

## Target

Keep the element always mounted (so there's a persistent node to transition, and so a rapid appear→disappear→appear sequence retargets a CSS transition instead of restarting a keyframe), and drive visibility via `grid-template-rows` + `opacity`, which lets height animate without knowing the content's pixel height in advance:

```tsx
/* target */
import { IconAlertCircle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export function FieldError({
  id,
  children,
  className,
}: {
  id: string;
  children?: string | null;
  className?: string;
}) {
  const hasError = Boolean(children);
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-(--duration-press) ease-(--ease-out)",
        hasError ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <p
        id={id}
        className={cn("flex items-start gap-1 overflow-hidden text-xs text-error-text", className)}
      >
        <IconAlertCircle size={13} stroke={2} aria-hidden className="mt-px shrink-0" />
        <span>{children}</span>
      </p>
    </div>
  );
}
```

Notes on the target:
- `grid-template-rows` animating between `0fr` and `1fr` is the standard CSS-only technique for animating to "auto height" without JS measuring the element — it needs the grid wrapper (`<div className="grid ...">`) and the child (`<p>`) to have `overflow-hidden` on the child so content doesn't visibly overflow the collapsing row during the transition.
- `id` moves from the outer element to the inner `<p>` — callers pass `id` so a sibling input's `aria-describedby` can point at it; keeping the id on the `<p>` (the element that actually contains the message) rather than the always-present wrapper `<div>` preserves that contract exactly.
- `children` is always rendered now (even when falsy, coerced by `hasError`'s check), so `<span>{children}</span>` would render `<span></span>` when empty — harmless (zero height, zero width, invisible via the wrapper's `opacity-0`), but confirm no caller relies on `FieldError` returning `null` for a conditional-rendering check elsewhere (see Boundaries).

## Repo conventions to follow

- `duration-(--duration-press)` and `ease-(--ease-out)` reference the tokens plan 001 adds — this is the same custom-property-reference syntax already used elsewhere in this codebase (`origin-(--radix-popover-content-transform-origin)` in `popover.tsx:33`).
- This is the first grid-rows-based height transition in the codebase; there's no existing exemplar to imitate, so this plan is introducing the pattern. Keep it exactly as specified rather than approximating with a `max-height` transition (max-height transitions have a well-known problem: they either need an arbitrary large fixed value, which delays the visual settle, or animate `height`/`max-height` directly, which is the layout-triggering property AUDIT.md category 5 flags).

## Steps

1. Rewrite `src/components/ui/field-error.tsx` to match the Target code exactly: remove the early `if (!children) return null;` return, wrap the `<p>` in a `<div>` whose classes toggle between `grid-rows-[1fr] opacity-100` and `grid-rows-[0fr] opacity-0` based on `Boolean(children)`, move `overflow-hidden` onto the `<p>`, and add `transition-[grid-template-rows,opacity] duration-(--duration-press) ease-(--ease-out)` to the wrapper `<div>`.
2. Grep the codebase for `<FieldError` to find every call site and confirm none of them do something like `{errors.email && <FieldError ... />}` expecting `FieldError` itself to return `null` for a *layout* reason beyond what's now handled internally — if a call site conditionally renders `FieldError` itself (rather than relying on `FieldError`'s own internal `null` return), that's fine and needs no change, since the component now handles its own empty state via the grid-rows collapse instead.

## Boundaries

- Do NOT change `FieldError`'s public prop shape (`id`, `children`, `className`) — every call site must keep working unmodified.
- Do NOT touch any of the form components that render `<FieldError>` — this plan only changes the component itself.
- Do NOT add a library dependency for this — plain CSS grid-rows is sufficient.
- If `field-error.tsx`'s current content no longer matches the "Problem" excerpt above verbatim (drift since commit a8aaf2a), STOP and report instead of rewriting over unknown changes.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**: run the dev server, go to `/login`, submit with an invalid email. Confirm:
  - The error message now grows in smoothly (height + fade) rather than snapping into existence and shoving the layout below it down instantly.
  - Fix the email, confirm the error shrinks back out smoothly rather than vanishing.
  - Rapidly alternate between an invalid and valid value (e.g. type, delete, type) to retrigger the error several times quickly — confirm the transition always retargets smoothly from its current state rather than jumping or restarting from fully-collapsed each time.
  - In DevTools Rendering panel, force `prefers-reduced-motion: reduce`: the global catch-all in `globals.css:399-408` forces `transition-duration: 0.01ms !important` on everything, so confirm the error still appears/disappears (just without a perceptible animation) rather than getting stuck.
- **Done when**: every form's validation error grows/shrinks smoothly instead of teleporting, rapid re-triggering never looks broken, and `npx tsc --noEmit && npx eslint .` both exit 0.
