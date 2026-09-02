# Load testing (roadmap A2 #5)

k6 scripts that exercise Hayven's public "find a therapist" journey under
load. This is the read-heavy path a pilot launch actually stresses: SSR
rendering, the discovery query, and Supabase's read capacity.

## What this does and doesn't cover

**Covered:** anonymous browsing — home, Learn articles, `/search` with
filters and sorts, therapist profile pages, the needs-assessment landing.
All GET, no auth, no writes.

**Not covered (deliberately):**

- **Authenticated flows** (parent dashboard, booking creation, report
  generation). These need real Supabase sessions and Next server-action
  calls — fragile to script and much lower traffic than discovery at
  launch. Test these by hand with a few concurrent real logins, or add a
  dedicated script later (see "Phase 2" below).
- **Payment** (`initiatePaystackPayment`). It calls Paystack's API and
  redirects off-site; load testing it hammers a third party, not us.
- **The notifications cron.** It's a single scheduled call, not a
  user-facing path. If you want to check it holds up with a large backlog,
  seed a few hundred past-dated confirmed bookings and hit
  `/api/cron/notifications` once with the `Authorization: Bearer $CRON_SECRET`
  header while watching the Supabase dashboard.

## Prerequisites

### 1. Install k6

```powershell
winget install k6.k6          # Windows
# or: choco install k6 / scoop install k6
```

```bash
brew install k6               # macOS
```

Verify: `k6 version`.

### 2. A target environment that is NOT production

The scripts refuse to run against `hayven.com.ng`. You need a separate
deploy backed by a **throwaway Supabase project**, because:

- the discovery query reads the live `therapist_public_profiles` view — a
  load test against prod data spikes the real families' experience;
- you'll want to seed dozens of fake therapists, which you do not want in
  the real database.

Two ways to get one:

| Option | How | Realism |
| --- | --- | --- |
| **Clone prod** (best) | In Supabase: create a new project, then restore a `pg_dump` of production into it (or use Supabase's branching if enabled). Point a Vercel preview deploy's `NEXT_PUBLIC_SUPABASE_URL` / keys at the clone. | High — real data volume and shape |
| **Fresh + seed** | New Supabase project → run every migration through `0076` → run [`seed-therapists.sql`](./seed-therapists.sql) in the SQL editor. Deploy a Vercel preview with its env pointing there. | Medium — synthetic but sized realistically |

Either way, set the preview deploy's env exactly like production **except**
the Supabase + `NEXT_PUBLIC_SITE_URL` values, and leave PostHog **unset** on
the preview so the run doesn't flood analytics.

### 3. Confirm it's seeded

```bash
k6 run -e BASE_URL=https://your-preview.vercel.app load-test/smoke.js
```

The smoke run logs how many therapist profiles and articles it found in the
sitemap. If therapist profiles = 0, the profile-page portion of the load
test is a no-op — seed first.

## Running

Always `smoke` first, then `browse`, then (optionally) `stress`.

```bash
# 1. Sanity check — 1 user, 1 pass, ~15s
k6 run -e BASE_URL=https://your-preview.vercel.app load-test/smoke.js

# 2. Main load test — ramps to 50 concurrent browsers, ~11 min
k6 run -e BASE_URL=https://your-preview.vercel.app load-test/browse.js

#    tune it:
k6 run -e BASE_URL=... -e PEAK=100 -e HOLD=8m -e RAMP=2m load-test/browse.js

# 3. Find the breaking point — arrival rate climbs 20→300 req/s, ~11 min,
#    auto-aborts if error rate passes 25%
k6 run -e BASE_URL=https://your-preview.vercel.app load-test/stress.js
```

Save a full result for comparison across runs:

```bash
k6 run -e BASE_URL=... --summary-export results/browse-$(date +%Y%m%d).json load-test/browse.js
```

While a run is going, watch:

- **Vercel** → the project's Observability / Functions tab — invocations,
  duration, concurrency, any 5xx.
- **Supabase** → Reports → Database — CPU, active connections vs. the
  connection limit, slow queries.

## Interpreting results

k6 prints a summary. The thresholds in [`config.js`](./config.js) decide
pass/fail (the process exits non-zero on a breach):

| Metric | Gate | Means |
| --- | --- | --- |
| `http_req_failed` | < 1% | almost no requests error |
| `http_req_duration` p95 | < 1.5s | 95% of requests finish under 1.5s |
| `http_req_duration{kind:document}` p95 | < 1.8s | full SSR page loads stay reasonable |
| `checks` | > 99% | responses are real pages, not error shells |

A breach isn't automatically "we can't launch" — it's "here's the ceiling".
Adjust the thresholds if you consciously accept a slower p95, and note it in
the run log.

### Known things to watch for

- **The discovery query does a full scan + in-app filter.**
  `searchDiscoveryTherapists` loads *every* verified therapist, then fetches
  review summaries and next-available slots for all of them, then filters in
  JS. Fine for tens of therapists; if p95 on `/search` climbs steeply as the
  seed size grows, that's the code path to optimise (push filters into the
  query, or cache the discovery list).
- **Supabase connection limit.** The free/small tiers cap Postgres
  connections low. If errors start under load and the Supabase dashboard
  shows connections pegged, switch the app's connection string to the
  **pooler** (transaction mode) or move up a tier.
- **Middleware runs on every page.** `src/proxy.ts` refreshes the Supabase
  session app-wide. For anonymous traffic `getUser()` short-circuits with no
  network call, so this should be cheap — but if authed-user page latency is
  much worse than anonymous, the per-request `getUser()` + `users` role
  lookup is why. (`/ingest/*` analytics beacons are excluded from the
  matcher so they don't pay this cost.)
- **Cold starts.** The first requests after a quiet period on Vercel
  serverless will be slow. The ramp-up stage absorbs most of this; ignore
  the first ~20s of any run.

## Phase 2 — authenticated & booking load (when it's worth it)

Not built yet. When pilot traffic justifies it:

1. Create N test parent accounts on the staging project.
2. In a k6 `setup()`, log each in via Supabase Auth's
   `POST /auth/v1/token?grant_type=password` to get an `access_token` +
   `refresh_token`.
3. Build the `sb-<ref>-auth-token` cookie(s) `@supabase/ssr` expects (it
   chunks a base64-encoded JSON session across `.0`, `.1` … cookies) and
   send them on each request.
4. Drive `/parent`, `/parent/sessions`, `/parent/children/*` reads.
5. For booking writes, replay the server-action HTTP calls (capture them
   from DevTools: `POST` to the page URL with `Next-Action` header and the
   multipart body). Stop before `initiatePaystackPayment`.

This is materially more work and more brittle — only do it if the read-path
test above passes comfortably and you specifically need write-path numbers.
