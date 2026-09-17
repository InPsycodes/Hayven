# 001 — Introduce shared easing/duration motion tokens

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: LOW–MEDIUM
- **Category**: 7. Cohesion & tokens
- **Estimated scope**: 1 file (`src/app/globals.css`), ~10 lines added, no removals

## Problem

`src/app/globals.css` defines a `:root` token block for color (`--terracotta`, `--care-bg`, etc.) but has zero `--ease-*` or `--duration-*` custom properties. Every component that needs a curve or duration hand-types it: `duration-100` (three places), `duration-200`, `duration-300`, `duration-[250ms]`, `duration-[280ms]`, bare `ease-out`. This is a prerequisite for plans 002 and 005, which reference these tokens rather than inventing more one-off values.

## Target

Add a "Motion" section to `:root` in `src/app/globals.css`, right after the existing `--radius: 0.2rem;` line (currently line 159) and before the block closes (currently line 169):

```css
/* target — inserted after line 159 (--radius: 0.2rem;), before the :root closing brace */
  /* Motion — see .claude/skills/improve-animations/AUDIT.md for the source
     values. Strong custom curves (built-in CSS easings are too weak for
     deliberate UI motion); duration tokens match this catalog's budget
     table by element class. */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --duration-press: 160ms;    /* button/control press feedback */
  --duration-popover: 180ms;  /* tooltips, small popovers */
  --duration-dropdown: 200ms; /* dropdowns, selects */
  --duration-modal: 300ms;    /* modals, drawers */
```

## Repo conventions to follow

- Every existing token in this file is a plain CSS custom property inside `:root { ... }`, grouped by section with a `/* comment */` header (see `/* Warm-dark "care portal" palette... */` at line 118, `/* Sharp corners on desktop */` at line 158). Follow the same style: a short header comment, then the properties.
- Tailwind v4's `@theme inline` block (lines 15-90) re-exposes some `:root` tokens as Tailwind theme values (e.g. `--color-background: var(--background);`). Do NOT add these new motion tokens to `@theme inline` — they're consumed as raw CSS custom properties via arbitrary-value Tailwind syntax (e.g. `duration-(--duration-modal)` or inline `style`), not as new Tailwind utility names. Keeping them `:root`-only avoids expanding Tailwind's generated utility surface for values only a handful of components use.

## Steps

1. In `src/app/globals.css`, insert the six-line block above (comment + 6 custom properties) immediately after `--radius: 0.2rem;` (line 159) and before the blank line that precedes `--sidebar: var(--charcoal);` (line 161). Result: lines 158-169 read:
   ```css
     /* Sharp corners on desktop (2-4px) */
     --radius: 0.2rem;

     /* Motion — see .claude/skills/improve-animations/AUDIT.md for the source
        values. Strong custom curves (built-in CSS easings are too weak for
        deliberate UI motion); duration tokens match this catalog's budget
        table by element class. */
     --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
     --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
     --duration-press: 160ms;
     --duration-popover: 180ms;
     --duration-dropdown: 200ms;
     --duration-modal: 300ms;

     --sidebar: var(--charcoal);
     --sidebar-foreground: var(--offwhite);
     --sidebar-primary: var(--terracotta);
     --sidebar-primary-foreground: #ffffff;
     --sidebar-accent: color-mix(in oklch, var(--charcoal), white 12%);
     --sidebar-accent-foreground: var(--offwhite);
     --sidebar-border: color-mix(in oklch, var(--offwhite), transparent 90%);
     --sidebar-ring: var(--terracotta);
   }
   ```

## Boundaries

- Do NOT touch any other file in this plan — it only adds tokens, no consumer is wired up yet (that's plans 002 and 005).
- Do NOT add these tokens to the `@theme inline` block.
- Do NOT modify any existing token in `:root`.
- If line 159 no longer reads exactly `--radius: 0.2rem;` (drift since commit a8aaf2a), STOP and report instead of guessing a new insertion point.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect: clean, this is a CSS-only change so it can't affect it, but run it to catch anything unrelated already broken) and `npx eslint .` (expect: clean). No visual/build verification needed yet since nothing consumes these tokens until plans 002/005 land.
- **Done when**: the six new custom properties exist in `:root` at the exact location above, `git diff src/app/globals.css` shows only additions (no lines removed or changed), and `npx tsc --noEmit && npx eslint .` both exit 0.
