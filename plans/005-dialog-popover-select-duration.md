# 005 — Bump Dialog/Popover/Select entrance duration to their category floor

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: MEDIUM
- **Category**: 2. Easing & duration
- **Estimated scope**: 3 files, 1 token-reference swap each
- **Depends on**: 001 (uses `--duration-popover`, `--duration-dropdown`, `--duration-modal`)

## Problem

All three Radix-backed overlay primitives hard-code `duration-100`, under AUDIT.md's budget floor for every one of these element classes.

```tsx
/* src/components/ui/dialog.tsx:42 — current (DialogOverlay) */
"fixed inset-0 isolate z-50 bg-black/15 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
```

```tsx
/* src/components/ui/dialog.tsx:64 — current (DialogContent) */
"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-white/50 bg-[linear-gradient(180deg,rgba(250,248,246,0.92)_0%,rgba(250,248,246,0.8)_100%)] p-4 text-sm text-popover-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_24px_60px_-18px_rgba(26,18,12,0.4)] backdrop-blur-xl backdrop-saturate-150 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

```tsx
/* src/components/ui/popover.tsx:33 — current */
"z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-2.5 rounded-xl border border-white/50 bg-[linear-gradient(180deg,rgba(250,248,246,0.92)_0%,rgba(250,248,246,0.8)_100%)] p-2.5 text-sm text-popover-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_16px_40px_-14px_rgba(26,18,12,0.35)] backdrop-blur-xl backdrop-saturate-150 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

```tsx
/* src/components/ui/select.tsx:72 — current */
"relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border border-white/50 bg-[linear-gradient(180deg,rgba(250,248,246,0.94)_0%,rgba(250,248,246,0.85)_100%)] text-popover-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_16px_40px_-14px_rgba(26,18,12,0.35)] backdrop-blur-xl backdrop-saturate-150 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

## Target

Replace each `duration-100` with the token matching its AUDIT.md element class:

- `dialog.tsx:42` (overlay) and `dialog.tsx:64` (content) → `duration-(--duration-modal)` (200–500ms budget; token = 300ms)
- `popover.tsx:33` → `duration-(--duration-popover)` (125–200ms budget; token = 180ms)
- `select.tsx:72` → `duration-(--duration-dropdown)` (150–250ms budget; token = 200ms)

Every other class in each string stays exactly as-is — this is a single-token find/replace per file, not a rewrite.

## Repo conventions to follow

- `duration-(--custom-property)` is the Tailwind v4 syntax for consuming a `:root` custom property as a duration, set up by plan 001. This exact syntax is already used in these same files for other custom-property references (e.g. `origin-(--radix-popover-content-transform-origin)` in `popover.tsx:33`), so the bracket style is consistent with the codebase's existing usage.

## Steps

1. In `src/components/ui/dialog.tsx`, in `DialogOverlay`'s className (line 42), replace `duration-100` with `duration-(--duration-modal)`.
2. In the same file, in `DialogContent`'s className (line 64), replace `duration-100` with `duration-(--duration-modal)`.
3. In `src/components/ui/popover.tsx`, in `PopoverContent`'s className (line 33), replace `duration-100` with `duration-(--duration-popover)`.
4. In `src/components/ui/select.tsx`, in `SelectContent`'s className (line 72), replace `duration-100` with `duration-(--duration-dropdown)`.

## Boundaries

- Do NOT change any other part of these class strings — no easing, no `data-*` variant classes, no slide-direction classes.
- Do NOT touch `accordion.tsx` or any other Radix-backed component not listed above.
- Apply plan 001 first — these tokens must exist in `globals.css:root` before this plan's classes reference them, or Tailwind will emit `transition-duration: initial` (the fallback for an undefined custom property), which is a silent regression, not a build error.
- If any of the four cited `duration-100` occurrences no longer appear verbatim at its cited file:line (drift since commit a8aaf2a), STOP and report instead of guessing which duration string to touch.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean. `npm run build` once, and grep the built CSS output for `--duration-modal`/`--duration-popover`/`--duration-dropdown` usage to confirm Tailwind actually resolved the arbitrary-value syntax (a malformed `duration-(--x)` reference silently produces no transition-duration rule rather than a build failure).
- **Feel check**: run the dev server.
  - Open the notification bell dropdown (Popover) on any authenticated page: confirm it now takes a beat longer to appear/disappear than before, but still feels immediate, not sluggish.
  - Open any `Select` dropdown (e.g. `AssignPicker` in `/supervisor` or a category picker in `/admin/learning`): same check.
  - `Dialog` is not currently imported anywhere in the app (confirmed during the audit) — if that's still true when this plan runs, there is nothing to feel-check for `DialogOverlay`/`DialogContent` live; just confirm the class-string edit is correct and move on. If a `Dialog` usage has been added since, feel-check it: open it, confirm the entrance/exit both read as a deliberate 300ms fade+scale, not a snap.
  - In DevTools Animations panel, set playback to 10% for the popover/select open and confirm the duration reads as visibly longer than the 100ms it replaced.
- **Done when**: all four `duration-100` occurrences are replaced with their token per the mapping above, the built CSS contains real (non-`initial`) duration values for each, and `npx tsc --noEmit && npx eslint .` both exit 0.
