# 002 — Scope `transition-all` on Button, Badge, and Tabs to the properties that actually change

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: HIGH
- **Category**: 5. Performance (compounded by 1. Purpose & frequency)
- **Estimated scope**: 3 files, one class-string edit each
- **Depends on**: 001 (uses `--duration-press`)

## Problem

The three most-reused interactive primitives in the app all animate `transition-all`, which watches every animatable CSS property (box-shadow, border-color, outline, etc.) instead of only the ones that change on hover/active/focus — off-GPU work paid on every interaction, and these are hit dozens to hundreds of times per session across every portal.

```tsx
/* src/components/ui/button.tsx:8 — current (excerpt) */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ...
```

```tsx
/* src/components/ui/badge.tsx:8 — current (excerpt) */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  ...
```

```tsx
/* src/components/ui/tabs.tsx:66 — current (excerpt, TabsTrigger className, first string) */
"relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:ring-1 group-data-[variant=default]/tabs-list:data-active:ring-border [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

## Target

Replace `transition-all` with an explicit property list covering exactly what each component's variants actually change (background-color, border-color, color, box-shadow/ring, and the button's own `translate-y-px` press transform), each keeping its own scoped duration. Button additionally gets its press-feedback duration from the new `--duration-press` token (plan 001).

```tsx
/* target — button.tsx:8, replace `transition-all` with: */
"transition-[color,background-color,border-color,box-shadow,translate] duration-(--duration-press)"
```

```tsx
/* target — badge.tsx:8, replace `transition-all` with: */
"transition-[color,background-color,border-color,box-shadow]"
```

```tsx
/* target — tabs.tsx:66, replace `transition-all` with: */
"transition-[color,background-color,border-color,box-shadow]"
```

Badge and Tabs keep Tailwind's default transition duration/easing (no explicit `duration-*`/`ease-*` was present before this change, so none is added now — only the animated-property list narrows). Button gains an explicit duration because its `active:` press state is the one place in this file where AUDIT.md's category-3 press-feedback timing (100–160ms) is directly relevant.

## Repo conventions to follow

- Tailwind v4 arbitrary-property transition syntax `transition-[prop1,prop2]` is already used elsewhere in this codebase for scoped transitions (e.g. `src/lib/booking/window.ts` isn't relevant, but grep `transition-\[` in `src/components/` for other examples of the same bracket syntax before making this edit, to match existing formatting conventions if any exist).
- `duration-(--custom-property)` is Tailwind v4's syntax for consuming a CSS custom property as a duration utility (parentheses, not square brackets, for referencing an existing token vs. an arbitrary literal) — this is the same token-reference pattern plan 001 sets up.

## Steps

1. In `src/components/ui/button.tsx`, in the `buttonVariants` cva call's base class string (line 8), replace the single word `transition-all` with `transition-[color,background-color,border-color,box-shadow,translate] duration-(--duration-press)`. Leave every other class in that string untouched.
2. In `src/components/ui/badge.tsx`, in the `badgeVariants` cva call's base class string (line 8), replace `transition-all` with `transition-[color,background-color,border-color,box-shadow]`. Leave every other class untouched.
3. In `src/components/ui/tabs.tsx`, in `TabsTrigger`'s className (line 66, the first string in the `cn(...)` call), replace `transition-all` with `transition-[color,background-color,border-color,box-shadow]`. Leave every other class, and the other three strings in that `cn(...)` call, untouched.

## Boundaries

- Do NOT touch `badge-variants`/`button-variants`/`tabs-trigger` variant-specific class strings (the `variants: { variant: {...} }` objects) — only the base class string in each file.
- Do NOT change markup, props, or component structure.
- Do NOT touch any other `ui/*.tsx` file — `select.tsx`, `popover.tsx`, `dialog.tsx` are plan 005's scope, not this one.
- If plan 001 hasn't been applied yet (no `--duration-press` token in `globals.css:root`), apply plan 001 first — this plan's button.tsx step depends on it.
- If the exact `transition-all` substring cited above doesn't appear verbatim at the cited line (drift since commit a8aaf2a), STOP and report instead of guessing which occurrence to change.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect: clean — this is a className string change, no type surface affected) and `npx eslint .` (expect: clean). Run `npm run build` once after this plan and plan 005 are both applied, to confirm Tailwind actually generates the new arbitrary-value utility classes without error (Tailwind v4 arbitrary values are generated at build time; a typo in the bracket syntax would silently produce no styles rather than a build error, so also grep the built CSS output for `transition-\[color,background-color` after building to confirm the class made it through — or just do the feel-check below, which would visibly fail if the utility didn't generate).
- **Feel check**: run the dev server, open any page with buttons/badges/tabs (e.g. `/login` for buttons, `/admin/accounts` for badges, any therapist page with tabs if present). Hover and click a button: confirm the background/border/ring still transition smoothly (no more abrupt than before), and that unrelated properties (e.g. `outline` on focus) no longer visibly animate differently than before — this is a scoping change, not a timing change, so hover/press should look identical to a human eye; only DevTools' Performance/Rendering panel would show fewer properties being watched.
  - In DevTools Elements panel, select a `Button`, confirm the computed `transition-property` value no longer includes `all`.
  - Click-and-hold a button, confirm the `translateY(1px)` press-down still happens and still releases smoothly.
- **Done when**: all three files show `transition-all` replaced exactly as specified, `git diff` touches only the three cited lines (each a single-token replacement plus, for button.tsx, an added duration token reference), and `npx tsc --noEmit && npx eslint .` both exit 0.
