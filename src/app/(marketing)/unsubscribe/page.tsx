import Link from "next/link";

import { getEmailPreferencesByToken } from "@/lib/notifications/preferences-server";
import { EmailPreferenceToggles } from "@/components/shared/email-preference-toggles";

export const metadata = { title: "Email preferences · Hayven" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const result = t ? await getEmailPreferencesByToken(t) : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16 md:py-24">
      <h1 className="font-serif text-2xl text-charcoal">Email preferences</h1>

      {!result ? (
        <p className="text-sm text-muted-foreground">
          This link is invalid or has expired. You can manage these emails from your account settings
          instead &mdash;{" "}
          <Link href="/login" className="font-medium text-terracotta hover:underline">
            sign in
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl bg-canvas-white p-6 ring-1 ring-charcoal/10">
          <p className="text-sm text-ink-soft">
            Choose which non-essential emails go to <span className="font-medium text-charcoal">{result.email}</span>.
            Changes save as you make them.
          </p>
          <EmailPreferenceToggles initial={result.prefs} token={t} />
        </div>
      )}
    </div>
  );
}
