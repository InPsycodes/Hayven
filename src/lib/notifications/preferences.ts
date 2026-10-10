// Client-safe: pure constants and types only. The DB reads live in
// preferences-server.ts (which pulls in next/headers and must not reach a
// client bundle).

export interface EmailPreferences {
  email_session_reminders: boolean;
  email_messages: boolean;
  email_report_nudges: boolean;
  email_home_practice: boolean;
}

export const EMAIL_PREF_DEFAULTS: EmailPreferences = {
  email_session_reminders: true,
  email_messages: true,
  email_report_nudges: true,
  email_home_practice: true,
};

export const EMAIL_PREF_FIELDS: {
  key: keyof EmailPreferences;
  label: string;
  hint: string;
}[] = [
  {
    key: "email_session_reminders",
    label: "Session reminders",
    hint: "A heads-up the day before, and shortly before a session starts.",
  },
  {
    key: "email_messages",
    label: "New messages",
    hint: "When someone sends you a message about a child.",
  },
  {
    key: "email_report_nudges",
    label: "Report nudges",
    hint: "A reminder when a published report is still unread.",
  },
  {
    key: "email_home_practice",
    label: "Home practice reminders",
    hint: "A nudge midweek if nothing has been logged for your child's home practice yet.",
  },
];

/** Keep only the known boolean keys -- never trust a raw patch from the client. */
export function pickEmailPreferences(patch: Record<string, unknown>): Partial<EmailPreferences> {
  const out: Partial<EmailPreferences> = {};
  for (const { key } of EMAIL_PREF_FIELDS) {
    if (typeof patch[key] === "boolean") out[key] = patch[key] as boolean;
  }
  return out;
}
