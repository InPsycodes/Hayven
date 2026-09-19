/**
 * Split out from actions.ts: a file with a top-level "use server" directive
 * may only export async functions -- a plain array export there gets
 * replaced with a server-reference proxy instead of the real value once
 * imported into a Client Component (surfaces as "<x>.map is not a
 * function"), not the array itself.
 */
export const REFERRAL_REASON_TAGS = [
  "Speech / language",
  "Behavior",
  "Development",
  "Learning",
  "Motor",
  "Autism concerns",
  "Other",
] as const;
