"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { updatePassword } from "@/lib/auth/reset-actions";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const handleSubmit = guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      reset();
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      reset();
      return;
    }
    startTransition(async () => {
      const result = await updatePassword(password);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      router.push("/login?reset=1");
      router.refresh();
    });
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-xl text-charcoal">Set a new password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose something you haven&apos;t used on Hayven before.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Save new password"}
      </Button>
    </form>
  );
}
