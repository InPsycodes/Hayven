import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";
import { EMAIL_PREF_DEFAULTS, type EmailPreferences } from "@/lib/notifications/preferences";
import type { NotificationType } from "@/lib/notifications/create";

/** Which preference (if any) gates the email/push copy of a given notification type. */
export const EMAIL_PREF_BY_TYPE: Partial<Record<NotificationType, keyof EmailPreferences>> = {
  session_reminder: "email_session_reminders",
  new_message: "email_messages",
  report_reminder: "email_report_nudges",
  home_practice_reminder: "email_home_practice",
};

const PREF_COLUMNS = "email_session_reminders, email_messages, email_report_nudges, email_home_practice";

function coerce(row: Partial<EmailPreferences> | null): EmailPreferences {
  return row ? { ...EMAIL_PREF_DEFAULTS, ...row } : EMAIL_PREF_DEFAULTS;
}

export async function getMyEmailPreferences(): Promise<EmailPreferences> {
  const session = await getSession();
  if (!session) return EMAIL_PREF_DEFAULTS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select(PREF_COLUMNS)
    .eq("user_id", session.userId)
    .maybeSingle();
  return coerce(data as Partial<EmailPreferences> | null);
}

export async function getEmailPreferencesByToken(
  token: string
): Promise<{ email: string; prefs: EmailPreferences } | null> {
  const userId = verifyUnsubscribeToken(token);
  if (!userId) return null;
  const admin = createAdminClient();
  const [{ data: user }, { data: pref }] = await Promise.all([
    admin.from("users").select("email").eq("id", userId).maybeSingle(),
    admin.from("notification_preferences").select(PREF_COLUMNS).eq("user_id", userId).maybeSingle(),
  ]);
  if (!user) return null;
  return { email: user.email as string, prefs: coerce(pref as Partial<EmailPreferences> | null) };
}
