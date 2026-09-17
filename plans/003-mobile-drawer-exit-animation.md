# 003 — Add exit animation to both mobile nav drawers

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: HIGH
- **Category**: 4. Interruptibility
- **Estimated scope**: 2 files, ~4 class-string edits total

## Problem

Two separate mobile drawer implementations (public marketing nav, admin/staff nav) each animate their entrance with `animate-in`/`slide-in-from-left-full`/`fade-in`, but have no `animate-out`/`slide-out-to-left`/`fade-out` counterpart. Both drawers are conditionally rendered (`{isOpen && ...}` / `{isOpen && createPortal(...)}`), so setting `isOpen` to `false` unmounts the DOM node immediately — the open animation is smooth, the close is an instant teleport.

```tsx
/* src/components/marketing/mobile-nav-menu.tsx:100-119 — current */
{isOpen &&
  createPortal(
    <div className="fixed inset-0 z-[60] md:hidden">
      <div
        aria-hidden
        onClick={() => setIsOpen(false)}
        className={cn(
          "absolute inset-0 bg-charcoal/40 backdrop-blur-sm",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[250ms]",
          "motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]"
        )}
      />
      <div
        /* panel */
        className={cn(
          "absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col justify-between px-4 py-8 ...",
          "motion-safe:animate-in motion-safe:slide-in-from-left-full motion-safe:duration-[280ms] motion-safe:ease-out",
          "motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]"
        )}
      >
```

```tsx
/* src/components/layout/staff-mobile-sidebar.tsx:108-129 — current (same shape) */
{isOpen &&
  createPortal(
    <div className="fixed inset-0 z-[60] md:hidden">
      <div
        aria-hidden
        onClick={() => setIsOpen(false)}
        className={cn(
          "absolute inset-0 bg-charcoal/40 backdrop-blur-sm",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[250ms]",
          "motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]"
        )}
      />
      <div
        id="staff-mobile-sidebar-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col justify-between px-4 py-8 ...",
          "motion-safe:animate-in motion-safe:slide-in-from-left-full motion-safe:duration-[280ms] motion-safe:ease-out",
          "motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]"
        )}
        style={{ ... }}
      >
```

This is a real architectural fix, not just a class addition: since the panel unmounts the instant `isOpen` becomes `false`, adding `animate-out` classes alone won't play, because React removes the DOM node before the browser can run the exit animation. The component needs to delay the actual unmount until the exit animation finishes.

## Target

Both components need the same fix, applied independently (different files, same pattern — this is the "may merge into one plan" case from the plan-authoring notes, since it's one fix pattern across two files):

1. Track a second piece of state — whether the drawer is still animating out — so the portal stays mounted for the duration of the exit animation.
2. Add the `data-closed`/`animate-out` classes (tw-animate-css, already used elsewhere in this codebase for the `data-open`/`data-closed` pattern — see `src/components/ui/popover.tsx:33`) instead of a raw boolean-driven unmount.

Concretely, replace the `{isOpen && ...}` gate with a small closing-state machine:

```tsx
/* target pattern for both files */
const [isOpen, setIsOpen] = useState(false);
const [isClosing, setIsClosing] = useState(false);

function close() {
  setIsClosing(true);
}

function handleAnimationEnd() {
  if (isClosing) {
    setIsOpen(false);
    setIsClosing(false);
  }
}

// render:
{(isOpen || isClosing) &&
  createPortal(
    <div className="fixed inset-0 z-[60] md:hidden">
      <div
        aria-hidden
        onClick={close}
        onAnimationEnd={handleAnimationEnd}
        className={cn(
          "absolute inset-0 bg-charcoal/40 backdrop-blur-sm",
          !isClosing && "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[250ms] motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]",
          isClosing && "motion-safe:animate-out motion-safe:fade-out motion-safe:duration-[200ms] motion-reduce:animate-out motion-reduce:fade-out motion-reduce:duration-[200ms]"
        )}
      />
      <div
        /* panel, same idea */
        onAnimationEnd={handleAnimationEnd}
        className={cn(
          "absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col justify-between px-4 py-8 ...",
          !isClosing && "motion-safe:animate-in motion-safe:slide-in-from-left-full motion-safe:duration-[280ms] motion-safe:ease-out motion-reduce:animate-in motion-reduce:fade-in motion-reduce:duration-[250ms]",
          isClosing && "motion-safe:animate-out motion-safe:slide-out-to-left-full motion-safe:duration-[220ms] motion-safe:ease-in motion-reduce:animate-out motion-reduce:fade-out motion-reduce:duration-[200ms]"
        )}
      >
```

Every existing call site that sets `setIsOpen(false)` (the backdrop click handler, an Escape-key handler if one exists, a nav-link click) must become a call to `close()` instead, so the exit animation always plays rather than an instant unmount from some paths and an animated one from others.

## Repo conventions to follow

- `data-open`/`data-closed`-driven `animate-in`/`animate-out` via `tw-animate-css` is the established pattern for Radix-backed components (`src/components/ui/popover.tsx:33`, `select.tsx:72`, `dialog.tsx:42,64`) — but those get `data-state` for free from Radix. These two drawers are hand-rolled (no Radix primitive backing them), so they need the `isClosing`-boolean + `onAnimationEnd` pattern above instead of `data-state`, since there's no Radix `Root` managing open/closed state to read from.
- The exit duration is deliberately slightly shorter than the entrance (280ms in → ~220ms out is a common asymmetry: entrances can take their time, exits should feel prompt) — this isn't in AUDIT.md as a hard rule, but matches AUDIT.md's category-4 "asymmetric timing" principle ("deliberate phases... animate slower; the system's response snaps").

## Steps — `src/components/marketing/mobile-nav-menu.tsx`

1. Read the full file first to find every place that calls `setIsOpen(false)` (the backdrop `onClick`, and likely a nav-link `onClick` that closes the menu after navigating) and every place `isOpen` gates rendering.
2. Add `const [isClosing, setIsClosing] = useState(false);` next to the existing `isOpen` state.
3. Add a `close` function: `function close() { setIsClosing(true); }`.
4. Add a `handleAnimationEnd` function: `function handleAnimationEnd() { if (isClosing) { setIsOpen(false); setIsClosing(false); } }`.
5. Change the render gate from `{isOpen && createPortal(...)}` to `{(isOpen || isClosing) && createPortal(...)}`.
6. Replace every call to `setIsOpen(false)` inside the drawer's JSX (backdrop click, nav-link click, any close button) with a call to `close()`.
7. On the backdrop `<div>` and the panel `<div>`, add `onAnimationEnd={handleAnimationEnd}`.
8. Split each element's `motion-safe`/`motion-reduce` animate-in classes into an `!isClosing && "..."` branch (existing classes, unchanged) and add a new `isClosing && "..."` branch with the exit classes shown in Target above, using `fade-out` for the backdrop and `slide-out-to-left-full` for the panel.

## Steps — `src/components/layout/staff-mobile-sidebar.tsx`

9. Repeat steps 2-8 identically for this file's `isOpen`/backdrop/panel structure (same shape, confirmed at lines 108-134).

## Boundaries

- Do NOT change the drawers' entrance animation values (duration, easing, direction) — only add the missing exit path.
- Do NOT touch any other drawer/sheet/modal in the codebase — this plan is scoped to exactly these two files.
- Do NOT introduce a new dependency (no Framer Motion, no `react-transition-group`) — plain React state + `onAnimationEnd` is sufficient and matches the codebase's existing no-motion-library convention.
- If either file's current structure has drifted from the excerpts above (different state variable names, a different close-trigger list) since commit a8aaf2a, STOP and report the actual structure rather than guessing where to hook `close()` in.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**: run the dev server at a mobile viewport width (or DevTools device toolbar). For each drawer (public site hamburger menu, and an admin/staff account's mobile sidebar):
  - Open it: confirm the entrance looks unchanged (backdrop fades in, panel slides in from the left over ~280ms).
  - Close it via the backdrop tap: confirm the panel now visibly slides back out to the left and the backdrop fades out, instead of vanishing instantly.
  - Tap a nav link inside the open drawer: confirm it still closes (and ideally still shows the exit animation, though a fast navigation may cut it short — that's acceptable).
  - Open, then immediately close before the entrance finishes: confirm nothing gets stuck half-open or throws a console error (this exercises `onAnimationEnd` firing correctly even on an interrupted entrance).
  - In DevTools Rendering panel, force `prefers-reduced-motion: reduce` and repeat the open/close: confirm both directions still work (no permanently-stuck-open drawer) and use only the `fade-in`/`fade-out` motion-reduce classes, no slide.
- **Done when**: both drawers show a visible, correct exit animation on every close path, `prefers-reduced-motion` still works in both directions, and `npx tsc --noEmit && npx eslint .` both exit 0.
