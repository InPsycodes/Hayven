"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { useFieldErrors } from "@/hooks/use-field-errors";
import { emailDomainSuggestion, emailFormatError } from "@/lib/validation/email";
import { signIn } from "@/lib/auth/actions";
import { verifyMfaLogin } from "@/lib/auth/mfa-actions";
import { identifyUser } from "@/lib/analytics/client";
import { roleHomePath } from "@/lib/auth/role-path";
import type { UserRole } from "@/data/types";

export function LoginForm({ justReset = false, next }: { justReset?: boolean; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { errors, clearFieldError, setFieldError, showErrors } = useFieldErrors();
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  function goHome(role: UserRole) {
    // A validated `next` (already relative-path-checked server-side in
    // page.tsx) wins over the role's default dashboard, so someone bounced
    // off a deep link to log in lands back on it instead of losing their
    // place -- e.g. mid-booking on /book/[id]/payment.
    router.push(next ?? roleHomePath(role));
    router.refresh();
  }

  const loginGuard = useSubmitGuard();

  const handleSubmit = loginGuard.guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nextErrors = {
      email: emailFormatError(email) ?? undefined,
      password: password ? undefined : "Enter your password.",
    };
    if (showErrors(nextErrors, ["email", "password"])) {
      loginGuard.reset();
      return;
    }

    startTransition(async () => {
      const result = await signIn(email, password);
      if (!result.ok) {
        setError(result.error);
        loginGuard.reset();
        return;
      }
      if ("mfaRequired" in result) {
        setMfaFactorId(result.factorId);
        loginGuard.reset();
        return;
      }
      identifyUser(result.userId, result.role);
      goHome(result.role);
    });
  });

  const mfaGuard = useSubmitGuard();

  const handleVerifyMfa = mfaGuard.guard((e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    setError(null);
    startTransition(async () => {
      const result = await verifyMfaLogin(mfaFactorId, mfaCode);
      if (!result.ok) {
        setError(result.error);
        mfaGuard.reset();
        return;
      }
      identifyUser(result.userId, result.role);
      goHome(result.role as UserRole);
    });
  });

  if (mfaFactorId) {
    return (
      <form onSubmit={handleVerifyMfa} className="flex flex-col gap-5">
        <div>
          <h2 className="font-heading text-xl text-charcoal">Enter your code</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open your authenticator app and enter the 6-digit code for Hayven.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="mfaCode">Verification code</Label>
          <Input
            id="mfaCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
        </div>

        {error && <p className="text-sm text-error-text">{error}</p>}

        <Button type="submit" size="lg" disabled={isPending || mfaCode.length !== 6} className="w-full">
          {isPending ? "Verifying..." : "Verify"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setMfaFactorId(null);
            setMfaCode("");
            setError(null);
          }}
          className="text-center text-sm text-muted-foreground hover:underline"
        >
          Back to log in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-xl text-charcoal">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">Log in to your Hayven account.</p>
      </div>

      {justReset && (
        <p className="rounded-sm bg-success/10 p-3 text-sm text-success-text">
          Your password has been updated. Log in with it below.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
            setEmailSuggestion(null);
          }}
          onBlur={(e) => {
            const fmt = emailFormatError(e.target.value);
            if (fmt) {
              setFieldError("email", fmt);
            } else {
              setEmailSuggestion(emailDomainSuggestion(e.target.value));
            }
          }}
          placeholder="you@example.com"
        />
        <FieldError id="email-error">{errors.email}</FieldError>
        {emailSuggestion && !errors.email && (
          <p className="text-xs text-muted-foreground">
            Did you mean{" "}
            <button
              type="button"
              className="font-medium text-rust-dark hover:underline"
              onClick={() => {
                setEmail(emailSuggestion);
                setEmailSuggestion(null);
              }}
            >
              {emailSuggestion}
            </button>
            ?
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-rust-dark hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          required
          value={password}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError("password");
          }}
          placeholder="••••••••"
        />
        <FieldError id="password-error">{errors.password}</FieldError>
      </div>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Logging in..." : "Log in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-rust-dark hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
