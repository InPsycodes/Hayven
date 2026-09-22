import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

/**
 * A tamper-proof, login-free handle for the email unsubscribe link:
 * `${userId}.${sig}` where sig is an HMAC over the user id.
 *
 * SEC-04, pre-launch audit (P3): this used to key on SUPABASE_SERVICE_ROLE_KEY
 * whenever UNSUBSCRIBE_SECRET wasn't set -- which, since UNSUBSCRIBE_SECRET
 * was never documented in .env.local.example, meant it always did in
 * practice. Low risk on its own (HMAC-SHA256 doesn't reveal the key from
 * its output), but a cross-trust-boundary smell: a low-stakes, world-facing
 * unsubscribe token was signed with the same secret that grants full
 * RLS-bypassing database access. UNSUBSCRIBE_SECRET is now the documented,
 * intended key (see .env.local.example). The service-role-key fallback is
 * kept, deliberately, rather than hard-failing if the new var isn't set --
 * this code path is already live in production today, signing real
 * unsubscribe links; a hard throw here would break that traffic the moment
 * this ships, before anyone's had a chance to set the new var. Warns once
 * per process instead, so the fallback is visible without being silent,
 * and stops firing the moment UNSUBSCRIBE_SECRET is set in the environment.
 */
let warnedAboutFallback = false;
function key(): string {
  const dedicated = process.env.UNSUBSCRIBE_SECRET;
  if (dedicated) return dedicated;
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      "UNSUBSCRIBE_SECRET is not set -- falling back to SUPABASE_SERVICE_ROLE_KEY for unsubscribe-token signing. " +
        "Set UNSUBSCRIBE_SECRET (see .env.local.example) so this token stops sharing a key with full database access."
    );
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "insecure-dev-fallback";
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
