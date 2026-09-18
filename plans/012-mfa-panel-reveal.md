# 012 — Reveal the MFA enroll/disable panels instead of teleporting them in

- **Status**: DONE
- **Commit**: 0d3c9c8
- **Severity**: Delight opportunity (from `find-animation-opportunities`, not an `improve-animations` audit finding -- previously flagged as a MEDIUM cohesion finding in that audit's auth-flow subagent report, but not selected for one of the 10 implemented plans)
- **Category**: 4. Interruptibility / 8. Missed opportunities
- **Estimated scope**: 1 file, 2 near-identical edits

## Problem

```tsx
/* src/components/shared/mfa-section.tsx:99-143 -- current, enroll panel */
      {step === "confirming" && qrCode && (
        <form onSubmit={confirmEnroll} className="flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
          <p className="text-sm text-charcoal">Scan this with your authenticator app:</p>
          {/* ...QR code, secret, code input, Confirm/Cancel buttons... */}
        </form>
      )}
```

```tsx
/* src/components/shared/mfa-section.tsx:145-181 -- current, disable panel */
      {step === "disabling" && (
        <form onSubmit={confirmDisable} className="flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
          <p className="text-sm text-charcoal">
            Enter a current code from your authenticator app to turn off two-factor authentication.
          </p>
          {/* ...code input, Turn off/Cancel buttons... */}
        </form>
      )}
```

Both panels are plain conditional renders with zero transition -- clicking "Enable" or "Turn off" makes the QR-code/code-entry form snap into existence with a hard layout jump, and clicking "Cancel" makes it vanish the same way. Unlike the other candidates this skill considered (onboarding checklist, earnings ledger, reports list), this one is a genuinely *live* moment: `MfaSection` is a client component (`isPending`, `useState` for `step`/`code`/`error`), so the reveal happens in real time in response to the user's own click, not on a fresh page load. Enabling or disabling two-factor auth is also about as rare and high-stakes as an account setting gets -- most users do it once, ever.

## Target

Add the existing `.reveal` utility class (`animation: rise 0.4s ease-out both`, already reduced-motion-safe via its `@media (prefers-reduced-motion: no-preference)` gate in `globals.css`) to both panels' outer `<form>`. No new CSS, no new keyframes, no new tokens.

```tsx
/* target -- enroll panel, only the <form> className changes */
      {step === "confirming" && qrCode && (
        <form onSubmit={confirmEnroll} className="reveal flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
          {/* ...unchanged... */}
        </form>
      )}
```

```tsx
/* target -- disable panel, only the <form> className changes */
      {step === "disabling" && (
        <form onSubmit={confirmDisable} className="reveal flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
          {/* ...unchanged... */}
        </form>
      )}
```

No exit animation is proposed here (unlike plan 003's drawers) -- `.reveal` only defines an entrance. The panel's disappearance (clicking Cancel, or a successful Confirm swapping `step` back to `idle`) is a state change straight into a *different* form (the idle "Enable"/"Turn off" button row), not a dismiss-in-place, so there's no shared element to animate an exit against; teleporting away here is acceptable the same way a modal's content swap after a successful action is (AUDIT.md category 4 doesn't require an exit for every entrance, only for reversible/rapidly-retriggered toggles like the drawers in plan 003, which this isn't -- a user doesn't rapidly toggle 2FA setup on and off).

## Repo conventions to follow

- `.reveal` is defined in `src/app/globals.css` inside `@layer utilities`, gated behind `@media (prefers-reduced-motion: no-preference)` -- no separate reduced-motion handling needed in this component.
- Matches the exact same utility-class-only approach as plan 011 -- this codebase's established pattern for a one-off entrance is "add `.reveal`/`.pop-in`/`.fade-in`", not a bespoke transition.

## Steps

1. In `src/components/ui/../shared/mfa-section.tsx`, in the enroll panel's `<form>` (currently line 100), add `reveal` to the start of the existing className string: `"reveal flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4"`.
2. In the same file, in the disable panel's `<form>` (currently line 146), make the identical change: `"reveal flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4"`.

## Boundaries

- Do NOT touch anything inside either `<form>` -- inputs, labels, buttons, error text all stay exactly as they are.
- Do NOT add an exit animation or change how `step` transitions between states -- see the Target section's reasoning for why this plan is entrance-only.
- Do NOT touch the `idle` state's enable/disable button row, or any other part of `mfa-section.tsx` outside these two `<form>` elements.
- If either `<form>`'s current className no longer matches the "Problem" excerpt above verbatim (drift since commit 0d3c9c8), STOP and report instead of guessing which one to touch.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**: run the dev server, sign in, go to a profile page with MFA settings (e.g. `/parent/profile` or `/therapist/profile`). Click "Enable" on two-factor auth: confirm the QR-code panel now rises/fades in instead of snapping into place. Cancel, then if an account already has MFA enrolled, click "Turn off" and confirm the disable panel does the same. Force `prefers-reduced-motion: reduce` in DevTools and repeat -- confirm both panels still appear correctly, just without the animation.
- **Done when**: both panels visibly ease in on mount, reduced-motion users see them appear instantly with full content intact, and `npx tsc --noEmit && npx eslint .` both exit 0.
