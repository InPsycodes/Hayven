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

// Flutterwave itself is the one dependency this suite deliberately never
// calls for real (a throwaway DB is fine to hammer; a third party API is
// not, and test-mode timing would make the concurrency tests flaky for
// reasons that have nothing to do with our own code). Deterministic fakes
// stand in; each test can override via vi.mocked(...).mockResolvedValueOnce(...)
// for a specific scenario (e.g. a failed transfer).
export const flutterwaveMock = {
  isFlutterwaveConfigured: vi.fn(() => true),
  createPaymentLink: vi.fn(async (params: { txRef: string }) => `https://checkout.flutterwave.com/pay/${params.txRef}`),
  verifyTransaction: vi.fn(async (transactionId: string) => ({
    id: transactionId,
    txRef: "",
    status: "successful",
    amountNaira: 0,
    currency: "NGN",
  })),
  verifyTransactionByRef: vi.fn(async (txRef: string) => ({
    id: "0",
    txRef,
    status: "successful",
    amountNaira: 0,
    currency: "NGN",
  })),
  listSuccessfulTransactions: vi.fn(
    async () => [] as Array<{ id: string; txRef: string; status: string; amountNaira: number; currency: string }>
  ),
  createRefund: vi.fn(async () => ({ id: `RF_test_${Math.random().toString(36).slice(2)}`, status: "completed" })),
  getRefund: vi.fn(async (id: string) => ({ id, status: "completed" })),
  listBanks: vi.fn(async () => [{ code: "058", name: "Guaranty Trust Bank (GTBank)" }]),
  resolveBankAccount: vi.fn(async () => ({ accountName: "Test Therapist", accountNumber: "0000000000" })),
  initiateTransfer: vi.fn(async (params: { reference: string }) => ({
    id: String(Math.floor(Math.random() * 1e9)),
    status: "SUCCESSFUL",
    reference: params.reference,
  })),
  getTransfer: vi.fn(async (id: string) => ({ id, status: "SUCCESSFUL", reference: "" })),
  verifyWebhookHash: vi.fn(() => true),
};

vi.mock("@/lib/payments/flutterwave", () => flutterwaveMock);
