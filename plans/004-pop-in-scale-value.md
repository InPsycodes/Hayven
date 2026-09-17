# 004 — Fix `pop-in` keyframe's initial scale value

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: MEDIUM
- **Category**: 3. Physicality & origin
- **Estimated scope**: 1 file, 1 line

## Problem

```css
/* src/app/globals.css:431-439 — current */
@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

Used on the notification-bell unread-count badge (`src/components/shared/notification-bell.tsx:49`), visible in every portal's header. `scale(0.7)` is well outside AUDIT.md's target band for entrance scale.

## Target

```css
/* target */
@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

## Repo conventions to follow

- AUDIT.md category 3: "Never `scale(0)` — nothing in the real world appears from nothing. Target: `scale(0.9–0.97)` + `opacity: 0`." `0.92` sits comfortably inside that band while still reading as a distinct "pop" for a small badge (a badge this size benefits from being nearer the low end of the range than the high end, since the visual scale delta needs to still be perceptible at ~16-20px).

## Steps

1. In `src/app/globals.css`, in the `@keyframes pop-in` block (lines 431-439), change the `from` rule's `transform: scale(0.7);` to `transform: scale(0.92);`. Leave the `to` rule and the rest of the keyframe untouched.

## Boundaries

- Do NOT touch the `rise` or `fade-in` keyframes in the same file — only `pop-in`.
- Do NOT touch `notification-bell.tsx` or any other consumer of this keyframe — this is a single shared definition, the fix applies everywhere it's used automatically.
- If `@keyframes pop-in` no longer starts at line 431 or its `from` block no longer reads `transform: scale(0.7);` (drift since commit a8aaf2a), STOP and report instead of guessing.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` (both irrelevant to a pure CSS change but should still exit 0, confirming nothing else broke).
- **Feel check**: run the dev server, sign in as any role with unread notifications (or trigger one — e.g. send a message to generate a notification), and watch the unread-count badge appear on the bell icon. Confirm it visibly "pops" in rather than fading in flat, and that the pop no longer looks like it's growing from nothing. In DevTools Animations panel, set playback to 10% and confirm the starting frame shows a visibly-shrunk-but-not-vanished badge, not a pinpoint.
- **Done when**: the one line is changed exactly as specified and the badge's entrance reads as a natural "settle into place" rather than "materialize from a dot."
