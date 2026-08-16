import "server-only";

import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";

/**
 * Backed by the check_rate_limit() Postgres function (migration 0046), not
 * a new third-party service -- runs fine for both an unauthenticated caller
 * (login, via the anon role) and an authenticated one, since the function
 * itself runs as security definer.
 *
 * Fails open on an infrastructure error (DB unreachable, migration not yet
 * applied): a rate limiter that takes the whole app down when its own
 * storage has a hiccup is a worse outcome than a brief window of
 * unthrottled requests.
 *
 * A tripped bucket also fires a Sentry alert -- this is the app's only
 * behavioral anomaly signal (Sentry otherwise only sees crashes, never
 * patterns like a burst of failed logins or one account hammering an
 * endpoint). Callers that want detection without blocking (e.g. a bulk-read
 * admin query) can call this and simply ignore the returned boolean; the
 * alert still fires on trip either way. Only the bucket's type prefix goes
 * to Sentry -- bucket keys can embed identifying detail (an email, a user
 * ID), which stays in the rate_limit_attempts table for investigation.
 */
export async function checkRateLimit(bucketKey: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("checkRateLimit RPC failed, failing open", bucketKey, error.message);
      return true;
    }
    const allowed = data === true;
    if (!allowed) {
      Sentry.captureMessage(`Rate limit exceeded: ${bucketKey.split(":")[0]}`, {
        level: "warning",
        tags: { anomaly: "rate_limit" },
      });
    }
    return allowed;
  } catch (err) {
    console.error("checkRateLimit threw, failing open", bucketKey, err);
    return true;
  }
}
