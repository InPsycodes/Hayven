"use client";

import { useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { EMAIL_PREF_FIELDS, type EmailPreferences } from "@/lib/notifications/preferences";
import { updateMyEmailPreferences, updateEmailPreferencesByToken } from "@/lib/notifications/actions";

/**
 * The three opt-out email toggles. Auto-saves on change (optimistic, reverts
 * on failure). Used both on the profile page (logged in) and on the
 * login-free /unsubscribe page (pass `token`).
 */
export function EmailPreferenceToggles({
  initial,
  token,
}: {
  initial: EmailPreferences;
  token?: string;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  function toggle(key: keyof EmailPreferences, next: boolean) {
    const prev = prefs;
    setPrefs({ ...prev, [key]: next });
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = token
        ? await updateEmailPreferencesByToken(token, { [key]: next })
        : await updateMyEmailPreferences({ [key]: next });
      if (!res.ok) {
        setPrefs(prev);
        setError(res.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {EMAIL_PREF_FIELDS.map((field) => (
        <label key={field.key} className="flex items-start gap-3">
          <Checkbox
            checked={prefs[field.key]}
            onCheckedChange={(c) => toggle(field.key, c === true)}
            className="mt-0.5"
          />
          <span className="flex flex-col">
            <span className="text-sm font-medium text-charcoal">{field.label}</span>
            <span className="text-xs text-muted-foreground">{field.hint}</span>
          </span>
        </label>
      ))}
      {error && <p className="text-xs text-error-text">{error}</p>}
      {saved && !error && <p className="fade-in text-xs text-success-text">Saved.</p>}
      <p className="text-[11px] text-muted-foreground">
        Booking confirmations, payment receipts, and published reports are always emailed.
      </p>
    </div>
  );
}
