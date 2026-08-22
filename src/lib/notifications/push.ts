import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPushEndpoint } from "@/lib/notifications/push-endpoint";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Fire-and-forget, same shape as the email step in createNotification: a
 * push failure must never affect the in-app notification that already
 * landed. Sends to every subscription this user has (multiple devices/
 * browsers are normal), pruning any that the push service reports as gone
 * (410 Gone / 404 Not Found) rather than leaving dead rows to retry forever.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return;

  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subscriptions || subscriptions.length === 0) return;

  const body = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? "/" });

  await Promise.all(
    subscriptions.map(async (sub) => {
      if (!isValidPushEndpoint(sub.endpoint)) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("push send threw", sub.id, err);
        }
      }
    })
  );
}
