"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { acceptTherapistAgreement } from "@/lib/therapist/actions";

export function AgreementAcceptButton({ version }: { version: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex shrink-0 flex-col items-start gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await acceptTherapistAgreement(version);
            if (!res.ok) setError(res.error);
          })
        }
      >
        {pending ? "Saving..." : "I accept"}
      </Button>
      {error && <p className="text-xs text-error-text">{error}</p>}
    </div>
  );
}
