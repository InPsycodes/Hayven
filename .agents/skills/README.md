# Emil Kowalski's design/animation skills

Vendored from [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT, see `LICENSE`
in this directory) via `npx skills@latest add emilkowalski/skills`. Emil Kowalski built Sonner
and Vaul and worked on design engineering at Vercel and Linear; these are the skills he
personally uses to keep AI-generated UI from making the small, compounding taste mistakes
(wrong easing, solid borders instead of soft shadows, animating from `scale(0)`, etc.) that add
up to an interface feeling generic.

`skills-lock.json` (repo root) tracks the installed version/content hash of each skill for
`npx skills update`.

## What's actually relevant to Hayven

Hayven is a Next.js/React/Tailwind web app — most of this maps directly:

- **`animate`**, **`animation-vocabulary`**, **`find-animation-opportunities`**,
  **`improve-animations`**, **`review-animations`** — web animation principles, vocabulary,
  and audit process. Directly applicable to any motion work on the marketing site or the care
  portal.
- **`emil-design-eng`** — his broader design-engineering taste/judgement principles, not
  animation-specific.
- **`ask-sonner`** — Hayven doesn't currently use Sonner for toasts; useful if that ever
  changes, or as a reference for what a well-built toast API looks like.
- **`apple-design`**, **`pick-ui-library`**, **`prototype`** — general design-system and
  tooling judgement, platform-agnostic.

Three are platform-specific and not relevant to Hayven today (kept anyway, since the whole
package was pulled deliberately, not curated down): **`animate-expo`** (React Native/Expo),
**`mobile-native`** (native mobile feel), **`write-swift`** (Swift/iOS). Relevant only if a
companion native app is ever built.

## Re-syncing

```bash
npx skills@latest update emilkowalski/skills
```

pulls any changes Emil Kowalski has made upstream since this was vendored.
