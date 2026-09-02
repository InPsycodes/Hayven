import "server-only";
import crypto from "node:crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function paystackHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  reference: string;
}

export async function initializeTransaction(params: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNaira * 100),
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Failed to initialize payment.");
  }
  return { authorizationUrl: json.data.authorization_url, reference: json.data.reference };
}

export interface VerifyTransactionResult {
  status: string;
  reference: string;
  amountKobo: number;
  metadata: Record<string, unknown> | null;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: paystackHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Failed to verify payment.");
  }
  return {
    status: json.data.status,
    reference: json.data.reference,
    amountKobo: json.data.amount,
    metadata: json.data.metadata ?? null,
  };
}

// --- Refunds --------------------------------------------------------------

/**
 * POST /refund. `amountKobo` omitted = full refund. Paystack keeps its
 * processing fee; a partial `amountKobo` should already account for that.
 * Returns the refund status ("pending" | "processed" | ...); `refund.*`
 * webhooks confirm the final state.
 */
export async function createRefund(transactionReference: string, amountKobo?: number): Promise<{ status: string }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      transaction: transactionReference,
      ...(amountKobo && amountKobo > 0 ? { amount: Math.round(amountKobo) } : {}),
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Refund failed to initiate.");
  }
  return { status: json.data?.status ?? "pending" };
}

// --- Transfers (therapist payouts) -----------------------------------------

export interface ResolvedBankAccount {
  accountName: string;
  accountNumber: string;
}

/** GET /bank/resolve -- confirms an account number belongs to a real person. */
export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<ResolvedBankAccount> {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: paystackHeaders() }
  );
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Couldn't verify that bank account.");
  }
  return { accountName: json.data.account_name, accountNumber: json.data.account_number };
}

/** POST /transferrecipient -- created once per therapist, reused per transfer. */
export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<string> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      type: "nuban",
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: "NGN",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Couldn't set up the payout recipient.");
  }
  return json.data.recipient_code as string;
}

export interface TransferResult {
  /** paystack status: "success" | "pending" | "otp" | ... */
  status: string;
  transferCode: string;
  reference: string;
}

/** POST /transfer. In test mode (and live without OTP disabled) this can
 *  return status "otp" -- the caller records it as processing and the admin
 *  completes it in the Paystack dashboard. */
export async function initiateTransfer(params: {
  amountNaira: number;
  recipientCode: string;
  reason: string;
  reference: string;
}): Promise<TransferResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(params.amountNaira * 100),
      recipient: params.recipientCode,
      reason: params.reason,
      reference: params.reference,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Transfer failed to initiate.");
  }
  return {
    status: json.data.status,
    transferCode: json.data.transfer_code,
    reference: json.data.reference ?? params.reference,
  };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  // Timing-safe: a plain `===` on hex strings leaks how many leading
  // characters matched via response-time differences.
  const hashBuffer = Buffer.from(hash, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  if (hashBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, signatureBuffer);
}
