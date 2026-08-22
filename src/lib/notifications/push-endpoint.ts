/**
 * Browsers only ever hand back a push subscription pointed at their own
 * vendor's push service -- these are the only hosts that should ever appear
 * here. Enforced in two places: subscribeToPush (fail fast, good UX) and
 * sendPushToUser (the actual outbound-request chokepoint -- this table's
 * RLS policy only checks user_id ownership, not endpoint shape, so a client
 * could insert an arbitrary endpoint directly via the Supabase REST API and
 * skip the write-time check entirely; validating again right before the
 * real HTTP request goes out is what actually closes the SSRF hole).
 */
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];

export function isValidPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_PUSH_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );
}
