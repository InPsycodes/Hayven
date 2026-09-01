import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

/**
 * A tamper-proof, login-free handle for the email unsubscribe link:
 * `${userId}.${sig}` where sig is an HMAC over the user id. No new secret --
 * keyed on SUPABASE_SERVICE_ROLE_KEY, which is server-only and always set;
 * the key is never revealed (one-way HMAC) and the token isn't reversible
 * to anything but the already-opaque user id.
 */
function key(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "insecure-dev-fallback";
}

function sign(userId: string): string {
  return createHmac("sha256", key()).update(userId).digest("hex").slice(0, 24);
}

export function makeUnsubscribeToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(userId);
  if (sig.length !== expected.length) return null;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? userId : null;
  } catch {
    return null;
  }
}
