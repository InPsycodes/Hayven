# Money-flow integration tests

Runs the real server actions (`createPendingBooking`, `initiatePaystackPayment`,
`finalizeBookingPayment`, `runPayouts`, `processRefund`, `markNoShow`, ...) against a real
Postgres database with real RLS policies and real row-locking -- not mocks -- so it can prove
things a unit test can't, like whether two concurrent requests actually race.

**Never runs against production.** It targets `hayven_load_test` (Supabase ref
`sfvwfbgrfmqaaakbepll`), the throwaway project already used for k6 load testing. `test/integration/env.ts`
hard-fails if `NEXT_PUBLIC_SUPABASE_URL` doesn't match that ref, specifically so a stale or
wrong `.env.test` can't silently point this at something else.

## Running it

```bash
npm run test:integration
```

Needs `.env.test` in the repo root (gitignored, not committed) with that project's credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://sfvwfbgrfmqaaakbepll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role/secret key>
```

All from that project's Settings -> API page. Ask whoever set this up (or check a password
manager / the Supabase dashboard directly) rather than requesting these over chat again.

Takes 1-2 minutes -- most of that is real network round trips to a real database, deliberately
run sequentially (`fileParallelism: false` in `vitest.integration.config.ts`) since several
tests create real concurrent requests on purpose and don't want another test's fixtures in the
way.

## What it covers

- The full chain: create hold -> pay -> confirm -> complete -> earn -> payout.
- **H-1** (the payout double-claim race): fires two real concurrent `runPayouts()` calls and
  asserts the therapist is paid exactly once -- this is the one thing in this suite a unit test
  fundamentally cannot verify, since the bug only exists under real Postgres row-locking
  behavior between two simultaneous transactions.
- **M-2**: a refund outside the dispute flow reverses the therapist's earning.
- **M-5**: `markNoShow` rejects an already-completed session; still allows it on a
  still-confirmed, past-ended one.
- The pre-existing booking-slot hold race (two parents, one slot, exactly one wins) --
  regression lock-in for behavior that was already correct.

## How it works

- `env.ts` loads `.env.test` and guards against running anywhere but the throwaway project.
- `mocks.ts` mocks exactly three things, nothing else:
  - `next/cache`'s `revalidatePath`/`revalidateTag` (they throw outside a real Next.js
    request -- pure cache-invalidation side effects, not what's under test).
  - `@/lib/supabase/server`'s `createClient()` (its real implementation reads session cookies
    via `next/headers`, which doesn't exist outside a live request either). Swapped for
    whichever real, signed-in Supabase client `signInAs()` last set -- a genuine password-grant
    sign-in against the throwaway project, so `getSession()` and every RLS policy downstream
    run unmodified, for real.
  - `@/lib/payments/paystack` -- deterministic fakes. Paystack is the one dependency this suite
    deliberately never calls for real: a throwaway DB is fine to hammer, a third party's API
    (and its test-mode OTP/timing behavior) is not, especially under concurrency tests that
    need to be about our own code's timing, not Paystack's.
- `helpers.ts` creates real parents/therapists/children/slots via the admin client and Supabase
  Auth, tracks every row it creates, and deletes all of it (in FK-safe reverse order) after each
  test.

## Extending it

New scenarios go in `money-flow.integration.test.ts` or a new `*.integration.test.ts` file next
to it. Reuse `setupPayableEarning()` (or the auth/booking helpers it's built from) rather than
hand-rolling fixture setup per test. Every row a test creates outside the `helpers.ts` functions
needs `trackForCleanup(table, id)` or it'll leak into the throwaway project permanently.
