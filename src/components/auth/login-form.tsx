"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/actions";
import { verifyMfaLogin } from "@/lib/auth/mfa-actions";
import { roleHomePath } from "@/lib/auth/role-path";
import type { UserRole } from "@/data/types";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  function goHome(role: UserRole) {
    router.push(roleHomePath(role));
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if ("mfaRequired" in result) {
        setMfaFactorId(result.factorId);
        return;
      }
      goHome(result.role);
    });
  }

  function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId) return;
    setError(null);
    startTransition(async () => {
      const result = await verifyMfaLogin(mfaFactorId, mfaCode);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      goHome(result.role as UserRole);
    });
  }

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

        {error && <p className="text-sm text-error">{error}</p>}

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-xl text-charcoal">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">Log in to your Hayven account.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

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
