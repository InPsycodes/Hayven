import Link from "next/link";
import { IconUserExclamation } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

/**
 * Shown when a real, authenticated therapist has no therapist_profiles row
 * yet (expected for now -- profile/credential data isn't wired to Supabase
 * yet, only auth is). Not an auth failure, so this must never redirect to
 * /login -- the user IS logged in.
 */
export function IncompleteProfileNotice() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <IconUserExclamation size={32} stroke={1.5} className="text-muted-foreground" />
      <h1 className="font-heading text-xl text-charcoal">Finish setting up your profile</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your account is signed in, but we don&apos;t have your therapist profile yet. Complete
        your application to unlock your dashboard.
      </p>
      <Button asChild>
        <Link href="/signup/credentials">Continue application</Link>
      </Button>
    </div>
  );
}
