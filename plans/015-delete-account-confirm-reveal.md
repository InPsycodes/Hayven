# 015 — Reveal the account-deletion confirm form instead of hard-swapping it in

- **Status**: DONE
- **Commit**: 5b580d0
- **Severity**: LOW-MEDIUM
- **Category**: 8. Missed opportunities (+ 4. Interruptibility)
- **Estimated scope**: 1 file

## Problem

```tsx
/* src/components/shared/delete-account-section.tsx:44-75 — current, relevant branch */
) : expanded ? (
  <form action={formAction} className="flex flex-col gap-3">
    <Textarea
      name="reason"
      rows={3}
      placeholder="Anything you'd like us to know? (optional)"
    />
    {state.error && <p className="text-sm text-error-text">{state.error}</p>}
    <div className="flex gap-3">
      <Button
        type="submit"
        variant="outline"
        disabled={isPending}
        className="w-fit border-error text-error-text hover:bg-error/5"
      >
        {isPending ? "Submitting..." : "Confirm request"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setExpanded(false)} className="w-fit">
        Cancel
      </Button>
    </div>
  </form>
) : (
```

Clicking "Request account deletion" flips `expanded` and instantly swaps the single button for the full confirm form (textarea + Confirm/Cancel) — a destructive-confirmation moment with zero motion bridging the two states. This is exactly the "deliberate phase, destructive confirm" case: a moment that should read as deliberate, not instant, since the whole point of the intermediate step is to slow the user down before an irreversible-feeling action.

## Target

Give the form a rise-in on appearance, reusing the same `.reveal` utility already used for this exact kind of "a form/panel appears in place of something else" moment elsewhere in this codebase (plan 011, `confirmation-panel.tsx`; plan 012, `mfa-section.tsx`):

```tsx
/* target */
) : expanded ? (
  <form action={formAction} className="reveal flex flex-col gap-3">
    <Textarea
      name="reason"
      rows={3}
      placeholder="Anything you'd like us to know? (optional)"
    />
    {state.error && <p className="text-sm text-error-text">{state.error}</p>}
    <div className="flex gap-3">
      <Button
        type="submit"
        variant="outline"
        disabled={isPending}
        className="w-fit border-error text-error-text hover:bg-error/5"
      >
        {isPending ? "Submitting..." : "Confirm request"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setExpanded(false)} className="w-fit">
        Cancel
      </Button>
    </div>
  </form>
) : (
```

Only `reveal` is prepended to the `<form>`'s existing className. Nothing else changes.

## Repo conventions to follow

- Exemplar: `src/components/shared/mfa-section.tsx` (plan 012) — the enroll/disable `<form>` elements there already have `reveal` prepended to their className, the identical pattern being applied here.
- `.reveal` is `animation: rise 0.4s ease-out both;` (`globals.css:423-425`), reduced-motion-gated.

## Steps

1. In `src/components/shared/delete-account-section.tsx`, add `reveal` as the first class in the `className` string on the `<form action={formAction} ...>` element (around line 45), before `flex`. Do not reorder or remove any existing class.

## Boundaries

- Do NOT add motion to the `submitted` branch (lines 35-43, the "Request pending" state) — that's a status display, not a confirm-step reveal, and is out of scope for this plan.
- Do NOT add an exit animation for the Cancel button's collapse back to the single button — that requires delaying the `expanded=false` unmount, a larger change than this plan's scope.
- Do NOT touch `requestAccountDeletion`, the `submitted` derivation, or any other logic.
- If the current file no longer matches the "Problem" excerpt above verbatim (drift since commit 5b580d0), STOP and report instead of rewriting over unknown changes.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**:
  - On the account page, click "Request account deletion" and confirm the form rises into place rather than snapping in.
  - In DevTools, set Animations panel playback to 10% and confirm the motion is a simple rise (translateY + opacity).
  - Toggle `prefers-reduced-motion: reduce` and confirm the form still appears (just without perceptible motion).
- **Done when**: the confirm form visibly settles into place rather than teleporting, and `npx tsc --noEmit && npx eslint .` both exit 0.
