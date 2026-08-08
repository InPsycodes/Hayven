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
