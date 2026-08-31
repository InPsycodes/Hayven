"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { requestPasswordReset } from "@/lib/auth/reset-actions";

export function ForgotPasswordForm({ linkExpired = false }: { linkExpired?: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const handleSubmit = guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      setSent(true);
    });
  });

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-xl text-charcoal">Check your email</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-charcoal">{email}</span>, we&apos;ve sent a link to set a
          new password. It expires in an hour.
        </p>
        <Link href="/login" className="text-sm font-medium text-rust-dark hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-xl text-charcoal">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the email you signed up with and we&apos;ll send you a link.
        </p>
      </div>

      {linkExpired && (
        <p className="rounded-sm bg-amber/10 p-3 text-sm text-amber-text">
          That link has expired or already been used. Request a new one below.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Sending..." : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-rust-dark hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
