import "server-only";

import * as Sentry from "@sentry/nextjs";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Backed by the check_rate_limit() Postgres function (migration 0046), not
 * a new third-party service. Calls through the service-role client, not the
 * anon-key one -- migration 0055 revoked anon/authenticated's execute grant
 * on this function entirely, since granting it to those roles made the
 * function directly callable by anyone holding the public anon key straight
 * against PostgREST's /rpc endpoint (with attacker-controlled bucket_key/
 * limit/window), completely bypassing the server actions meant to be the
 * only caller. The service-role client bypasses grants/RLS by design, same
 * as every other privileged operation in this codebase.
 *
 * Fails open on an infrastructure error (DB unreachable, migration not yet
 * applied): a rate limiter that takes the whole app down when its own
 * storage has a hiccup is a worse outcome than a brief window of
 * unthrottled requests. That fail-open path is otherwise invisible (every
 * limit in the app -- login brute-force, signup spam, payment-init, message
 * flood, credential-upload quota -- would silently stop being enforced), so
 * it fires its own Sentry alert distinct from a tripped bucket's.
 *
 * A tripped bucket also fires a Sentry alert -- together these are the
 * app's only behavioral anomaly signal (Sentry otherwise only sees crashes,
 * never patterns like a burst of failed logins or one account hammering an
 * endpoint). Callers that want detection without blocking (e.g. a bulk-read
 * admin query) can call this and simply ignore the returned boolean; the
 * alert still fires on trip either way. Only the bucket's type prefix goes
 * to Sentry -- bucket keys can embed identifying detail (an email, a user
 * ID), which stays in the rate_limit_attempts table for investigation.
 *
 * failClosed opts a specific caller out of the fail-open default above --
 * for the handful of endpoints where an outage-shaped brute-force window is
 * worse than a false "too many attempts" during a real infrastructure
 * hiccup: login, signup, and the pediatrician referral status lookup (the
 * only "auth" that one has is a reference code, so it's the closest thing
 * this app has to a password to guess).
 */
export async function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number,
  opts?: { failClosed?: boolean }
): Promise<boolean> {
  const onUnavailable = opts?.failClosed ? false : true;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error(`checkRateLimit RPC failed, failing ${onUnavailable ? "open" : "closed"}`, bucketKey, error.message);
      Sentry.captureMessage(`Rate limit fail-${onUnavailable ? "open" : "closed"}: ${bucketKey.split(":")[0]}`, {
        level: "error",
        tags: { anomaly: "rate_limit_unavailable" },
        extra: { rpcError: error.message },
      });
      return onUnavailable;
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
    console.error(`checkRateLimit threw, failing ${onUnavailable ? "open" : "closed"}`, bucketKey, err);
    Sentry.captureMessage(`Rate limit fail-${onUnavailable ? "open" : "closed"}: ${bucketKey.split(":")[0]}`, {
      level: "error",
      tags: { anomaly: "rate_limit_unavailable" },
      extra: { thrown: err instanceof Error ? err.message : String(err) },
    });
    return onUnavailable;
  }
}
