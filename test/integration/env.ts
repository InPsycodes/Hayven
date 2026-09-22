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
process.env.PAYSTACK_SECRET_KEY ??= "sk_test_integration_placeholder";
process.env.UNSUBSCRIBE_SECRET ??= "integration-test-unsubscribe-secret-placeholder";
