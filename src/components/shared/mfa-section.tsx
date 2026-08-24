"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { enrollMfa, confirmMfaEnrollment, unenrollMfa } from "@/lib/auth/mfa-actions";
import type { MfaStatus } from "@/lib/auth/mfa-actions";

type Step = "idle" | "enrolling" | "confirming" | "disabling";

export function MfaSection({ initialStatus }: { initialStatus: MfaStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [step, setStep] = useState<Step>("idle");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEnroll() {
    setError(null);
    startTransition(async () => {
      const result = await enrollMfa();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFactorId(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep("confirming");
    });
  }

  const confirmEnrollGuard = useSubmitGuard();

  const confirmEnroll = confirmEnrollGuard.guard((e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmMfaEnrollment(factorId, code);
      if (!result.ok) {
        setError(result.error);
        confirmEnrollGuard.reset();
        return;
      }
      setStatus({ enrolled: true, factorId });
      setStep("idle");
      setCode("");
      setQrCode(null);
      setSecret(null);
    });
  });

  function startDisable() {
    setError(null);
    setCode("");
    setStep("disabling");
  }

  const confirmDisableGuard = useSubmitGuard();

  const confirmDisable = confirmDisableGuard.guard((e: React.FormEvent) => {
    e.preventDefault();
    if (!status.factorId) return;
    setError(null);
    startTransition(async () => {
      const result = await unenrollMfa(status.factorId!, code);
      if (!result.ok) {
        setError(result.error);
        confirmDisableGuard.reset();
        return;
      }
      setStatus({ enrolled: false, factorId: null });
      setStep("idle");
      setCode("");
    });
  });

  return (
    <div className="flex flex-col gap-3 rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base text-charcoal">Two-factor authentication</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Require a code from an authenticator app (like Google Authenticator or Authy) in addition to your
            password when logging in.
          </p>
        </div>
        <StatusBadge tone={status.enrolled ? "sage" : "grey"}>{status.enrolled ? "Enabled" : "Off"}</StatusBadge>
      </div>

      {step === "confirming" && qrCode && (
        <form onSubmit={confirmEnroll} className="flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
          <p className="text-sm text-charcoal">Scan this with your authenticator app:</p>
          <div
            className="h-40 w-40 self-center [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrCode }}
          />
          {secret && (
            <p className="text-center text-xs text-muted-foreground">
              Can&apos;t scan? Enter this code manually: <span className="font-mono">{secret}</span>
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="mfaConfirmCode">Enter the 6-digit code from your app</Label>
            <Input
              id="mfaConfirmCode"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={isPending || code.length !== 6} className="w-fit">
              {isPending ? "Verifying..." : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("idle");
                setQrCode(null);
                setSecret(null);
                setCode("");
                setError(null);
              }}
              className="w-fit"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {step === "disabling" && (
        <form onSubmit={confirmDisable} className="flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
          <p className="text-sm text-charcoal">
            Enter a current code from your authenticator app to turn off two-factor authentication.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mfaDisableCode">6-digit code</Label>
            <Input
              id="mfaDisableCode"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </div>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="outline" disabled={isPending || code.length !== 6} className="w-fit">
              {isPending ? "Verifying..." : "Turn off"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("idle");
                setCode("");
                setError(null);
              }}
              className="w-fit"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {step === "idle" && (
        <>
          {error && <p className="text-sm text-error-text">{error}</p>}
          <Button
            type="button"
            variant={status.enrolled ? "outline" : "default"}
            disabled={isPending}
            onClick={status.enrolled ? startDisable : startEnroll}
            className="w-fit"
          >
            {isPending ? "Working..." : status.enrolled ? "Turn off" : "Set up two-factor authentication"}
          </Button>
        </>
      )}
    </div>
  );
}
