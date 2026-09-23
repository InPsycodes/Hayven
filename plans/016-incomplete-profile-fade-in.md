# 016 — Fade in the incomplete-profile notice on first render

- **Status**: DONE
- **Commit**: 5b580d0
- **Severity**: LOW
- **Category**: 8. Missed opportunities
- **Estimated scope**: 1 file

## Problem

```tsx
/* src/components/shared/incomplete-profile-notice.tsx — current, full file */
import Link from "next/link";
import { IconUserExclamation } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

export function IncompleteProfileNotice() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <IconUserExclamation size={32} stroke={1.5} className="text-muted-foreground" />
      <h1 className="font-heading text-xl text-charcoal">Finish setting up your profile</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your account is signed in, but we don&apos;t have your therapist profile yet. Complete
        your application to unlock your dashboard.
      </p>
      <Button asChild>
        <Link href="/signup/credentials">Continue application</Link>
      </Button>
    </div>
  );
}
```

Rendered in place of a therapist's dashboard for a rare, specific first-visit state (a real, authenticated therapist with no `therapist_profiles` row yet — see the component's own doc comment). It's a full-page, server-rendered block with no motion at all, despite the codebase already using its `.fade-in` utility for comparable weight, occasional moments elsewhere (e.g. `support-request-section.tsx`'s confirmation message).

## Target

```tsx
/* target */
import Link from "next/link";
import { IconUserExclamation } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

export function IncompleteProfileNotice() {
  return (
    <div className="fade-in flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <IconUserExclamation size={32} stroke={1.5} className="text-muted-foreground" />
      <h1 className="font-heading text-xl text-charcoal">Finish setting up your profile</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your account is signed in, but we don&apos;t have your therapist profile yet. Complete
        your application to unlock your dashboard.
      </p>
      <Button asChild>
        <Link href="/signup/credentials">Continue application</Link>
      </Button>
    </div>
  );
}
```

Only `fade-in` is added, prepended to the wrapper `<div>`'s existing className. `.fade-in` (a plain opacity fade, `animation: fade-in 0.3s ease-out both;`, `globals.css:427-429`) is used rather than `.reveal` (which adds a rise/translate) because this is a centered, full-page informational state, not a directional panel/toast — a subtle fade suits it better than a rise, matching how the codebase already uses `fade-in` for similar-weight moments.

## Repo conventions to follow

- Exemplar: `src/components/shared/support-request-section.tsx:42` — same `.fade-in` utility, same reasoning (a calm, occasional-state fade rather than a directional entrance).
- `.fade-in` is reduced-motion-gated inside `globals.css`'s `@media (prefers-reduced-motion: no-preference)` block already — no extra guarding needed here.

## Steps

1. In `src/components/shared/incomplete-profile-notice.tsx`, add `fade-in` as the first class in the wrapper `<div>`'s className string, before `flex`. No other change.

## Boundaries

- Do NOT change the component's copy, icon, button, or link.
- Do NOT touch the `min-h-[60vh]` unit — that's a separate, already-audited concern (the mobile-native pass), not part of this animation plan.
- Do NOT add this class anywhere else — this plan is scoped to this one component.
- If the current file no longer matches the "Problem" excerpt above verbatim (drift since commit 5b580d0), STOP and report instead of rewriting over unknown changes.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**:
  - Render the notice (a signed-in therapist account with no `therapist_profiles` row) and confirm it fades in on load rather than appearing instantly.
  - Toggle `prefers-reduced-motion: reduce` and confirm it still renders (just without perceptible motion).
- **Done when**: the notice visibly fades in on first render, and `npx tsc --noEmit && npx eslint .` both exit 0.
