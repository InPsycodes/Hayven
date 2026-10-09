// Client-safe: used by the profile card and the dashboard notice.

const EXPIRING_SOON_DAYS = 30;

export type InsuranceCoverState = "missing" | "expired" | "ending_soon" | "current";

/** expiresOn is the YYYY-MM-DD cover end date; cover is treated as ended on that day. */
export function insuranceCoverState(expiresOn: string | null | undefined): InsuranceCoverState {
  if (!expiresOn) return "missing";
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (expiresOn <= today) return "expired";
  const soon = new Date(now + EXPIRING_SOON_DAYS * 86_400_000).toISOString().slice(0, 10);
  return expiresOn <= soon ? "ending_soon" : "current";
}
