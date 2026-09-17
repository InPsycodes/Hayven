# 008 — Reduce therapist progress-chart entrance duration from 800ms

- **Status**: DONE — with a correction: all 7 occurrences already had `animationEasing="ease-out"` set (the audit's premise that 5 of 7 lacked it didn't hold at execution time); only `animationDuration` needed changing on any of them.
- **Commit**: a8aaf2a
- **Severity**: MEDIUM
- **Category**: 2. Easing & duration (+ 1. Purpose & frequency)
- **Estimated scope**: 6 files, 7 prop edits total

## Problem

Every Recharts-based progress chart on the therapist child-overview page passes `animationDuration={800}`, well over AUDIT.md's 300ms UI budget, and every one of them replays from zero on every page load:

```tsx
/* src/components/therapy-session/charts/skill-acquisition-chart.tsx:35 — current */
          animationDuration={800}
```
```tsx
/* src/components/therapy-session/charts/reinforcer-effectiveness-chart.tsx:25 — current */
        <Bar dataKey="mean" fill="var(--color-mean)" radius={2} animationDuration={800} animationEasing="ease-out" />
```
```tsx
/* src/components/therapy-session/charts/goal-progress-chart.tsx:37 — current */
            animationDuration={800}
```
```tsx
/* src/components/therapy-session/charts/behaviour-trend-chart.tsx:31,40 — current (two instances) */
          animationDuration={800}
          ...
          animationDuration={800}
```
```tsx
/* src/components/therapy-session/charts/behaviour-frequency-chart.tsx:38 — current */
            animationDuration={800}
```
```tsx
/* src/components/therapy-session/charts/attendance-chart.tsx:20 — current */
        <Bar dataKey="sessions" fill="var(--color-sessions)" radius={2} animationDuration={800} animationEasing="ease-out" />
```

A therapist reviewing one child's progress mid-caseload sees up to 6 charts sweep in for 800ms each — this page is visited routinely (AUDIT.md's "tens of times/day" frequency band calls for removing or drastically reducing animation, not necessarily zeroing it, since a chart's first-paint reveal does have real explanatory value distinct from a decorative hover).

## Target

Reduce every `animationDuration={800}` to `animationDuration={300}` (AUDIT.md's UI ceiling) across all 7 occurrences in the 6 files. Two of the seven (`reinforcer-effectiveness-chart.tsx:25`, `attendance-chart.tsx:20`) already set `animationEasing="ease-out"` explicitly — correct per AUDIT.md's entering-element rule, leave that prop as-is. The other five have no explicit `animationEasing`, which means Recharts' own default (`"ease"`) applies; AUDIT.md's decision order calls for `ease-out` on entering/exiting elements, so add `animationEasing="ease-out"` to those five as well, matching the two that already have it.

```tsx
/* target — every occurrence */
animationDuration={300} animationEasing="ease-out"
```

## Repo conventions to follow

- `reinforcer-effectiveness-chart.tsx:25` and `attendance-chart.tsx:20` are the in-repo exemplars for the `animationDuration={...} animationEasing="ease-out"` pairing this plan extends to the other five occurrences.

## Steps

1. `src/components/therapy-session/charts/skill-acquisition-chart.tsx:35` — change `animationDuration={800}` to `animationDuration={300} animationEasing="ease-out"`.
2. `src/components/therapy-session/charts/reinforcer-effectiveness-chart.tsx:25` — change only `animationDuration={800}` to `animationDuration={300}` (leave the existing `animationEasing="ease-out"` on this line as-is).
3. `src/components/therapy-session/charts/goal-progress-chart.tsx:37` — change `animationDuration={800}` to `animationDuration={300} animationEasing="ease-out"`.
4. `src/components/therapy-session/charts/behaviour-trend-chart.tsx:31` — change `animationDuration={800}` to `animationDuration={300} animationEasing="ease-out"`.
5. `src/components/therapy-session/charts/behaviour-trend-chart.tsx:40` — change `animationDuration={800}` to `animationDuration={300} animationEasing="ease-out"`.
6. `src/components/therapy-session/charts/behaviour-frequency-chart.tsx:38` — change `animationDuration={800}` to `animationDuration={300} animationEasing="ease-out"`.
7. `src/components/therapy-session/charts/attendance-chart.tsx:20` — change only `animationDuration={800}` to `animationDuration={300}` (leave the existing `animationEasing="ease-out"` on this line as-is).

## Boundaries

- Do NOT change any other chart prop (colors, radius, dataKey, axes, tooltips).
- Do NOT touch any chart file not listed above.
- Do NOT disable the animation entirely (`animationDuration={0}` or removing the prop) — a first-paint reveal on an occasionally-visited detail page still has explanatory value per AUDIT.md's frequency table; the fix is bringing it under budget, not deleting it.
- If any cited line no longer reads `animationDuration={800}` verbatim (drift since commit a8aaf2a), STOP and report instead of guessing which prop to change.

## Verification

- **Mechanical**: `npx tsc --noEmit` and `npx eslint .` both clean.
- **Feel check**: run the dev server, sign in as a therapist with an assigned child who has session history, visit that child's overview page (the page rendering these 6 charts). Confirm every chart still visibly animates in on load (not instant, not jarring) but noticeably faster than before — should read as "the chart is ready" rather than "the chart is performing for me."
- **Done when**: all 7 occurrences across the 6 files show `animationDuration={300}`, all 7 have `animationEasing="ease-out"` (2 already had it, 5 gained it), and `npx tsc --noEmit && npx eslint .` both exit 0.
