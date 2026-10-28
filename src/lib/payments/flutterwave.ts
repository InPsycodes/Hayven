import "server-only";
import crypto from "node:crypto";

/**
 * Flutterwave v3 API (https://developer.flutterwave.com/v3.0/docs). Bearer
 * auth with the secret key. Amounts are in naira, not kobo.
 *
 * Environment:
 *   FLUTTERWAVE_SECRET_KEY    the secret key from Settings > API keys
 *   FLUTTERWAVE_WEBHOOK_HASH  the "secret hash" set under Settings > Webhooks;
 *                             Flutterwave sends it back in the verif-hash header
 */
const BASE_URL = "https://api.flutterwave.com/v3";

export function isFlutterwaveConfigured(): boolean {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

interface FlwResponse<T> {
  status?: string;
  message?: string;
  data?: T;
  meta?: { page_info?: { total_pages?: number; current_page?: number } };
}

async function call<T>(path: string, init?: RequestInit, fallbackError = "Flutterwave request failed."): Promise<FlwResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
  let json: FlwResponse<T>;
  try {
    json = (await res.json()) as FlwResponse<T>;
  } catch {
    throw new Error(fallbackError);
  }
  if (!res.ok || json.status !== "success") {
    throw new Error(json.message || fallbackError);
  }
  return json;
}

// --- Collections ------------------------------------------------------------

/** POST /payments: a hosted checkout link (Flutterwave Standard). */
export async function createPaymentLink(params: {
  txRef: string;
  amountNaira: number;
  email: string;
  name?: string;
  redirectUrl: string;
  meta: Record<string, string>;
}): Promise<string> {
  const json = await call<{ link: string }>(
    "/payments",
    {
      method: "POST",
      body: JSON.stringify({
        tx_ref: params.txRef,
        amount: params.amountNaira,
        currency: "NGN",
        redirect_url: params.redirectUrl,
        customer: { email: params.email, ...(params.name ? { name: params.name } : {}) },
        customizations: { title: "Hayven", description: "Therapy session booking" },
        meta: params.meta,
      }),
    },
    "Couldn't start the payment."
  );
  if (!json.data?.link) throw new Error("Couldn't start the payment.");
  return json.data.link;
}

export interface FlwTransaction {
  /** Flutterwave's numeric id, as a string. Needed for refunds. */
  id: string;
  txRef: string;
  /** "successful" | "failed" | "pending" */
  status: string;
  amountNaira: number;
  currency: string;
}

interface RawTransaction {
  id: number | string;
  tx_ref: string;
  status: string;
  amount: number;
  currency: string;
}

function toTransaction(raw: RawTransaction): FlwTransaction {
  return {
    id: String(raw.id),
    txRef: raw.tx_ref,
    status: String(raw.status).toLowerCase(),
    amountNaira: Number(raw.amount),
    currency: raw.currency,
  };
}

/** GET /transactions/{id}/verify: the authoritative state of one payment. */
export async function verifyTransaction(transactionId: string): Promise<FlwTransaction> {
  const json = await call<RawTransaction>(
    `/transactions/${encodeURIComponent(transactionId)}/verify`,
    undefined,
    "Couldn't verify the payment."
  );
  if (!json.data) throw new Error("Couldn't verify the payment.");
  return toTransaction(json.data);
}

/** GET /transactions/verify_by_reference: the same lookup by our own tx_ref. */
export async function verifyTransactionByRef(txRef: string): Promise<FlwTransaction> {
  const json = await call<RawTransaction>(
    `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    undefined,
    "Couldn't verify the payment."
  );
  if (!json.data) throw new Error("Couldn't verify the payment.");
  return toTransaction(json.data);
}

/**
 * GET /transactions, every page, successful payments only, for the
 * reconciliation sweep. `from` and `to` are YYYY-MM-DD.
 */
export async function listSuccessfulTransactions(params: { from: string; to: string }): Promise<FlwTransaction[]> {
  const out: FlwTransaction[] = [];
  for (let page = 1; page <= 50; page++) {
    const qs = new URLSearchParams({ from: params.from, to: params.to, status: "successful", page: String(page) });
    const json = await call<RawTransaction[]>(`/transactions?${qs}`, undefined, "Couldn't list transactions.");
    for (const t of json.data ?? []) out.push(toTransaction(t));
    const totalPages = json.meta?.page_info?.total_pages ?? 1;
    if (page >= totalPages) break;
  }
  return out;
}

// --- Refunds ----------------------------------------------------------------

export interface FlwRefund {
  id: string;
  /** "completed", "completed-...", "pending-...", "processing", ... see refundOutcome. */
  status: string;
}

/** POST /transactions/{id}/refund. Minimum ₦100. Omit the amount for a full refund. */
export async function createRefund(transactionId: string, amountNaira?: number): Promise<FlwRefund> {
  const json = await call<{ id: number | string; status: string }>(
    `/transactions/${encodeURIComponent(transactionId)}/refund`,
    {
      method: "POST",
      body: JSON.stringify(amountNaira && amountNaira > 0 ? { amount: Math.round(amountNaira) } : {}),
    },
    "The refund couldn't be started."
  );
  if (!json.data) throw new Error("The refund couldn't be started.");
  return { id: String(json.data.id), status: json.data.status };
}

/** GET /refunds/{id}: a refund's current state, for refunds still processing. */
export async function getRefund(refundId: string): Promise<FlwRefund> {
  const json = await call<{ id: number | string; status: string }>(
    `/refunds/${encodeURIComponent(refundId)}`,
    undefined,
    "Couldn't check the refund."
  );
  if (!json.data) throw new Error("Couldn't check the refund.");
  return { id: String(json.data.id), status: json.data.status };
}

// --- Banks and transfers (payouts) -----------------------------------------

export interface FlwBank {
  code: string;
  name: string;
}

/** GET /banks/NG: Nigerian banks with Flutterwave's codes. */
export async function listBanks(): Promise<FlwBank[]> {
  const json = await call<{ code: string; name: string }[]>("/banks/NG", undefined, "Couldn't load the bank list.");
  return (json.data ?? []).map((b) => ({ code: String(b.code), name: b.name }));
}

export interface ResolvedBankAccount {
  accountName: string;
  accountNumber: string;
}

/** POST /accounts/resolve: confirms an account number and returns the holder's name. */
export async function resolveBankAccount(accountNumber: string, bankCode: string): Promise<ResolvedBankAccount> {
  const json = await call<{ account_number: string; account_name: string }>(
    "/accounts/resolve",
    { method: "POST", body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }) },
    "Couldn't verify that bank account."
  );
  if (!json.data?.account_name) throw new Error("Couldn't verify that bank account.");
  return { accountName: json.data.account_name, accountNumber: json.data.account_number ?? accountNumber };
}

export interface TransferResult {
  id: string;
  /** "NEW" | "PENDING" | "SUCCESSFUL" | "FAILED", see transferOutcome. */
  status: string;
  reference: string;
}

/** POST /transfers: pays straight to an account number from the NGN balance. */
export async function initiateTransfer(params: {
  amountNaira: number;
  bankCode: string;
  accountNumber: string;
  narration: string;
  reference: string;
}): Promise<TransferResult> {
  const json = await call<{ id: number | string; status: string; reference: string }>(
    "/transfers",
    {
      method: "POST",
      body: JSON.stringify({
        account_bank: params.bankCode,
        account_number: params.accountNumber,
        amount: Math.round(params.amountNaira),
        currency: "NGN",
        debit_currency: "NGN",
        narration: params.narration.slice(0, 100),
        reference: params.reference,
      }),
    },
    "The transfer couldn't be started."
  );
  if (!json.data) throw new Error("The transfer couldn't be started.");
  return { id: String(json.data.id), status: json.data.status, reference: json.data.reference ?? params.reference };
}

/** GET /transfers/{id}: a payout's current state, for payouts still processing. */
export async function getTransfer(transferId: string): Promise<TransferResult> {
  const json = await call<{ id: number | string; status: string; reference: string }>(
    `/transfers/${encodeURIComponent(transferId)}`,
    undefined,
    "Couldn't check the transfer."
  );
  if (!json.data) throw new Error("Couldn't check the transfer.");
  return { id: String(json.data.id), status: json.data.status, reference: json.data.reference };
}

// --- Webhooks ---------------------------------------------------------------

/**
 * Flutterwave v3 sends the secret hash set in the dashboard, unchanged, in
 * the verif-hash header. Compared in constant time. Without a configured
 * hash nothing is accepted.
 */
export function verifyWebhookHash(header: string | null): boolean {
  // Trimmed: a newline or space picked up when pasting the value into a
  // hosting dashboard would otherwise reject every genuine delivery.
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH?.trim();
  header = header?.trim() ?? null;
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
