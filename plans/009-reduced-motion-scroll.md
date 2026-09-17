# 009 — Gate field-error smooth-scroll behind `prefers-reduced-motion`

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: MEDIUM
- **Category**: 6. Accessibility
- **Estimated scope**: 1 file

## Problem

```ts
/* src/hooks/use-field-errors.ts:34-47 — current */
  const showErrors = useCallback((next: FieldErrors, order: string[]) => {
    setErrors(next);
    const firstBad = order.find((name) => next[name]);
    if (firstBad && typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById(firstBad);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLElement).focus({ preventScroll: true });
        }
      });
    }
    return Boolean(firstBad);
  }, []);
```

Runs on every failed submit in `login-form.tsx`, `signup-form.tsx`, `forgot-password-form.tsx`, and `reset-password-form.tsx`. `globals.css:399-408`'s global reduced-motion catch-all only forces `animation-duration`/`transition-duration`/`scroll-behavior` to near-zero via CSS — it has no effect on a JS call's explicit `behavior: "smooth"` option, since that's imperative JS, not a CSS transition/animation. A user with `prefers-reduced-motion: reduce` set still gets the full smooth-scroll here.

## Target

```ts
/* target */
  const showErrors = useCallback((next: FieldErrors, order: string[]) => {
    setErrors(next);
    const firstBad = order.find((name) => next[name]);
    if (firstBad && typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById(firstBad);
        if (el) {
          const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
          (el as HTMLElement).focus({ preventScroll: true });
        }
      });
    }
    return Boolean(firstBad);
  }, []);
```

## Repo conventions to follow

- AUDIT.md category 6: "Reduced motion means fewer and gentler animations, not zero — keep transitions that aid comprehension, remove position changes. In JS: `useReducedMotion()` and branch transform values." This codebase has no `useReducedMotion()` hook (that's a Framer Motion API and this app has no motion library), so the equivalent here is a direct `window.matchMedia("(prefers-reduced-motion: reduce)").matches` check — the same query the global CSS catch-all's `@media (prefers-reduced-motion: reduce)` block already targets, just read from JS instead of CSS.
- `scrollIntoView({ behavior: "auto" })` still moves focus to the right field instantly (preserving the actual UX purpose — getting the user's attention to the invalid field), it just drops the animated scroll, matching AUDIT.md's "remove position changes" (the animated scroll *is* the position-change motion) while keeping "transitions that aid comprehension" (the fact that focus/scroll happens at all).

## Steps

1. In `src/hooks/use-field-errors.ts`, inside the `requestAnimationFrame` callback in `showErrors` (currently lines 38-44), add a line before the `el.scrollIntoView(...)` call: `const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;`.
2. Change the `el.scrollIntoView({ behavior: "smooth", block: "center" });` call to `el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });`.

## Boundaries

- Do NOT change the `focus({ preventScroll: true })` call or any other part of the hook.
- Do NOT touch any of the four form components that call `showErrors` — the fix is entirely inside the hook.
- Do NOT add a `matchMedia` listener/subscription for live changes to the setting mid-session — a one-time read at the moment of the failed submit is sufficient (matching how the global CSS catch-all also just applies the media query at evaluation time, no JS state needed).
- If `use-field-errors.ts`'s `showErrors` function no longer matches the excerpt above verbatim (drift since commit a8aaf2a), STOP and report instead of guessing where to insert the check.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**: run the dev server, open DevTools Rendering panel, set "Emulate CSS media feature prefers-reduced-motion" to "reduce." Go to `/login`, scroll the page down so the email field is off-screen, submit with an invalid email. Confirm the page jumps to the field instantly (no smooth scroll) but the field still receives focus. Then set the emulation back to "no preference" (or remove it) and repeat: confirm the smooth scroll still happens normally.
- **Done when**: the scroll is instant under reduced-motion and smooth otherwise, focus lands correctly in both cases, and `npx tsc --noEmit && npx eslint .` both exit 0.
