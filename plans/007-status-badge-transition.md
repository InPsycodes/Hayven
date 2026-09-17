# 007 — Add a color transition to StatusBadge tone changes

- **Status**: DONE
- **Commit**: a8aaf2a
- **Severity**: MEDIUM
- **Category**: 8. Missed opportunities
- **Estimated scope**: 1 file, 1 line

## Problem

```tsx
/* src/components/ui/status-badge.tsx:16-32 — current */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        sage: "bg-success/10 text-success-text",
        amber: "bg-amber/10 text-amber-text",
        rust: "bg-terracotta/10 text-rust-dark",
        error: "bg-error/10 text-error-text",
        grey: "bg-charcoal/6 text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "grey",
    },
  }
);
```

`StatusBadge` is the primary state signal across every admin/supervisor queue (`accounts-table.tsx` Active↔Suspended, `deletion-request-row.tsx` Pending→Reviewed→Actioned, `supervisor-request-row.tsx` Pending→Approved/Denied, `support-request-row.tsx` Open→Resolved, and elsewhere). When the parent component re-renders with a new `tone` prop after an admin's action succeeds, the badge's background and text color swap instantly — no transition class exists anywhere in this file.

## Target

```tsx
/* target — base class string, line 17 */
"inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-[color,background-color] duration-(--duration-dropdown) ease-(--ease-out)"
```

`--duration-dropdown` (200ms, per plan 001) is reused here rather than inventing a new token — this is a small, frequent UI feedback moment in the same duration class as a dropdown reveal, not a modal-scale transition.

## Repo conventions to follow

- `transition-[color,background-color]` matches the scoped-property pattern from plan 002 (never `transition-all`).
- `duration-(--duration-dropdown)` and `ease-(--ease-out)` reference the tokens plan 001 adds.

## Steps

1. In `src/components/ui/status-badge.tsx`, in the `statusBadgeVariants` cva call's base class string (currently line 17: `"inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"`), append `transition-[color,background-color] duration-(--duration-dropdown) ease-(--ease-out)` to the end of the string. Leave every `tone` variant untouched.

## Boundaries

- Do NOT change the `tone` variants' color values — only add the transition to the base class.
- Do NOT touch any call site (`accounts-table.tsx`, `deletion-request-row.tsx`, etc.) — the fix is entirely in the shared component.
- Apply plan 001 first — this references `--duration-dropdown` and `--ease-out`, which must exist before this class string is meaningful.
- If the base class string no longer matches the excerpt above verbatim (drift since commit a8aaf2a), STOP and report instead of guessing where to append.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**: run the dev server, sign in as an admin, go to `/admin/accounts`, and suspend then reactivate a test account (or find any other status-badge-driven action, e.g. resolving a support request at `/admin/support`). Confirm the badge's background/text color now crossfades over the change instead of snapping.
- **Done when**: every `StatusBadge` tone change crossfades smoothly and `npx tsc --noEmit && npx eslint .` both exit 0.
