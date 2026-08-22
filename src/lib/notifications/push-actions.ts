"use server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isValidPushEndpoint } from "@/lib/notifications/push-endpoint";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function subscribeToPush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };

  if (!isValidPushEndpoint(subscription.endpoint)) {
    return { ok: false, error: "Unrecognized push subscription." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: session.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", session.userId);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
