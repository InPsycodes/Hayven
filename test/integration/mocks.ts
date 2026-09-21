import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// next/cache's revalidatePath/revalidateTag throw ("Invariant: static
// generation store missing") outside a real Next.js request -- they're
// cache-invalidation side effects, not part of the business logic this
// suite exists to verify, so they're no-ops here rather than something to
// route around per test.
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// @/lib/supabase/server's real createClient() reads the session from
// next/headers' cookies(), which only exists inside a live Next.js request.
// Swapped for a per-test "whoever is currently signed in" Supabase client --
// a REAL authenticated supabase-js client (real access token from a real
// sign-in against the throwaway project), so every RLS policy, every
// getSession() call, and every "am I allowed to do this" check downstream
// still runs for real. Only the cookie-transport mechanism is faked.
// The real createClient()'s generic Database type varies by inference site
// across this test suite's files; loosened deliberately here rather than
// fighting cross-module generic identity for glue code nothing
// type-sensitive reads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const currentUser: { client: SupabaseClient<any> | null } = { client: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    if (!currentUser.client) {
      throw new Error("No test user signed in -- call signInAs(user) before calling an action that needs a session.");
    }
    return currentUser.client;
  },
}));

// Paystack itself is the one dependency this suite deliberately never calls
// for real (a throwaway DB is fine to hammer; a third party's API is not,
// and its test-mode transfers/OTP behavior would make timing-sensitive
// concurrency tests flaky for reasons that have nothing to do with our own
// code). Deterministic fakes stand in; each test can override via
// vi.mocked(...).mockResolvedValueOnce(...) for a specific scenario (e.g. a
// failed transfer).
export const paystackMock = {
  initializeTransaction: vi.fn(async (params: { reference: string }) => ({
    authorizationUrl: `https://checkout.paystack.com/${params.reference}`,
    reference: params.reference,
  })),
  verifyTransaction: vi.fn(async (reference: string) => ({
    status: "success",
    reference,
    amountKobo: 0,
    metadata: null,
  })),
  createRefund: vi.fn(async () => ({ status: "processed" })),
  resolveBankAccount: vi.fn(async () => ({ accountName: "Test Therapist", accountNumber: "0000000000" })),
  createTransferRecipient: vi.fn(async () => `RCP_test_${Math.random().toString(36).slice(2)}`),
  initiateTransfer: vi.fn(async (params: { reference: string }) => ({
    status: "success",
    transferCode: `TRF_test_${Math.random().toString(36).slice(2)}`,
    reference: params.reference,
  })),
  verifyWebhookSignature: vi.fn(() => true),
  listSuccessfulTransactions: vi.fn(
    async () =>
      [] as Array<{
        reference: string;
        status: string;
        amountKobo: number;
        metadata: Record<string, unknown> | null;
      }>
  ),
};

vi.mock("@/lib/payments/paystack", () => paystackMock);
