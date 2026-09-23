# 013 — Make "Saved."/"Sent." confirmations retarget instead of restarting

- **Status**: DONE
- **Commit**: 5b580d0
- **Severity**: MEDIUM
- **Category**: 4. Interruptibility
- **Estimated scope**: 2 files

## Problem

```tsx
/* src/components/shared/email-preference-toggles.tsx:59-60 — current */
{error && <p className="text-xs text-error-text">{error}</p>}
{saved && !error && <p className="fade-in text-xs text-success-text">Saved.</p>}
```

`toggle()` (line 26) sets `setSaved(false)` the instant a checkbox is clicked, then `setSaved(true)` once the save resolves. The `<p>` is conditionally rendered, so each click cycle unmounts it (instant, no exit) and remounts it, restarting the `fade-in` `@keyframes` animation (`globals.css:427-429`, `animation: fade-in 0.3s ease-out both`) from `opacity: 0` every time. Toggling two checkboxes in quick succession makes "Saved." flicker rather than read as a persistent, up-to-date confirmation.

```tsx
/* src/components/shared/support-request-section.tsx:42 — current, same pattern */
{succeeded && <p className="fade-in text-sm text-success-text">Sent. We&apos;ll reply here and by email.</p>}
```

`succeeded` is derived from `useActionState`'s returned `state` (line 20). A second support-request submission while the form is still open (it doesn't auto-close on success) re-triggers the same restart-from-zero `fade-in`.

Both are plain React conditional mount/unmount, not Radix — no `Presence`/exit-animation constraint applies here (unlike Dialog/Popover/Accordion), so this is a normal CSS-transition fix.

## Target

Reuse the exact grid-rows technique already shipped for this exact class of problem in this codebase (plan 006, `field-error.tsx`): keep the confirmation message always mounted, and drive its visibility with a `transition` (which naturally retargets mid-flight) instead of mount/unmount + `animation` (which always restarts from `from`).

```tsx
/* src/components/shared/email-preference-toggles.tsx — target for the confirmation line */
{error && <p className="text-xs text-error-text">{error}</p>}
<div
  className={cn(
    "grid transition-[grid-template-rows,opacity] duration-(--duration-press) ease-(--ease-out)",
    saved && !error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
  )}
>
  <p className="overflow-hidden text-xs text-success-text">Saved.</p>
</div>
```

```tsx
/* src/components/shared/support-request-section.tsx — target for the confirmation line */
<div
  className={cn(
    "grid transition-[grid-template-rows,opacity] duration-(--duration-press) ease-(--ease-out)",
    succeeded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
  )}
>
  <p className="overflow-hidden text-sm text-success-text">Sent. We&apos;ll reply here and by email.</p>
</div>
```

## Repo conventions to follow

- `duration-(--duration-press)` / `ease-(--ease-out)` are the tokens plan 001 added to `globals.css`; this is the same custom-property-reference syntax `field-error.tsx` already uses post-plan-006.
- Exemplar: `src/components/ui/field-error.tsx` (current, post-plan-006 state) — same grid-rows-collapse pattern, same reason (mount-safe, interruption-safe, no keyframe restart).
- Both files already import `cn` from `@/lib/utils`? Check each file's imports — `email-preference-toggles.tsx` does not currently import `cn`; add the import (`import { cn } from "@/lib/utils";`) alongside its existing imports. `support-request-section.tsx` also does not currently import `cn`; add it there too.

## Steps

1. In `src/components/shared/email-preference-toggles.tsx`: add the `cn` import, then replace line 60 (`{saved && !error && <p className="fade-in text-xs text-success-text">Saved.</p>}`) with the Target markup above, keeping it directly after the existing `{error && ...}` line.
2. In `src/components/shared/support-request-section.tsx`: add the `cn` import, then replace line 42 (`{succeeded && <p className="fade-in text-sm text-success-text">Sent. We&apos;ll reply here and by email.</p>}`) with the Target markup above, in the same position inside the `<form>`.
3. Do not touch the `fade-in` keyframe/utility itself in `globals.css` — it's still used elsewhere (e.g. `incomplete-profile-notice.tsx` after plan 016); this plan only stops these two specific call sites from using it.

## Boundaries

- Do NOT change either component's save/submit logic (`toggle`, `formAction`, `succeeded`/`saved` state) — only the confirmation message's markup and classes.
- Do NOT touch the `{error && ...}` lines in either file.
- Do NOT add a library dependency.
- If either file's current content no longer matches the "Problem" excerpts above verbatim (drift since commit 5b580d0), STOP and report instead of rewriting over unknown changes.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**:
  - On the profile/email-preferences UI, toggle one checkbox, wait for "Saved." to appear, then immediately toggle another. Confirm "Saved." never flickers to invisible and back — it should read as continuously present, or smoothly stay in its settled state.
  - On the support-request form (account page), submit a request, then (if a second submission is possible while the form stays open) submit again. Confirm "Sent. …" doesn't restart from invisible.
  - In DevTools Rendering panel, force `prefers-reduced-motion: reduce`: the global catch-all in `globals.css` forces near-zero transition duration, so confirm both messages still show/hide correctly, just without a perceptible animation.
- **Done when**: rapid re-triggering of either confirmation message never looks like a flicker/restart, and `npx tsc --noEmit && npx eslint .` both exit 0.
