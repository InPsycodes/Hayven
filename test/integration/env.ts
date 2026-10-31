import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Loads .env.test (gitignored, throwaway-project credentials only) before
// any test file's imports run their own module-level env reads
// (createAdminClient() etc. read process.env at call time, but some Next
// internals read at import time, so this has to land before anything else).
const envPath = resolve(__dirname, "../../.env.test");
let raw: string;
try {
  raw = readFileSync(envPath, "utf8");
} catch {
  throw new Error(
    ".env.test not found. The integration suite runs against a real (throwaway, non-production) " +
      "Supabase project -- see test/integration/README.md for how to set one up."
  );
}
for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  process.env[key] = value;
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("sfvwfbgrfmqaaakbepll")) {
  // Hard-coded guard, not just a convention: this suite creates and deletes
  // real users/bookings/payments and runs real payout/refund logic
  // concurrently. Pointing it at the wrong project by accident (e.g. a
  // stale env var) must fail loudly, not quietly run against something
  // else -- and especially never against production, which doesn't have
  // this ref.
  throw new Error(
    "Integration tests must run against the hayven_load_test throwaway project " +
      "(ref sfvwfbgrfmqaaakbepll). NEXT_PUBLIC_SUPABASE_URL in .env.test doesn't match -- aborting " +
      "rather than risk running against the wrong database."
  );
}
process.env.FLUTTERWAVE_SECRET_KEY ??= "FLWSECK_TEST-integration-placeholder";
process.env.FLUTTERWAVE_WEBHOOK_HASH ??= "integration-test-webhook-hash";
process.env.UNSUBSCRIBE_SECRET ??= "integration-test-unsubscribe-secret-placeholder";

// Retry a request whose TCP/TLS connection never opened. From a slow or
// flaky link (seen on 31 Oct 2026: ~1% of connections to Supabase timing out
// at the 10s connect stage under parallel load) these failed tests at random
// with "fetch failed" and nothing to do with the code under test. Only
// connect-stage errors are retried: the server never received the request,
// so a retry can't double-apply anything (a user created twice, a refund
// fired twice). Anything later -- a reset mid-response -- still fails.
const CONNECT_ERRORS = new Set(["UND_ERR_CONNECT_TIMEOUT", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"]);
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await realFetch(input, init);
    } catch (e) {
      const code = (e as { cause?: { code?: string } }).cause?.code;
      if (attempt >= 3 || !code || !CONNECT_ERRORS.has(code)) throw e;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
};
