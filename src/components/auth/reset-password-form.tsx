"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { useFieldErrors } from "@/hooks/use-field-errors";
import { updatePassword } from "@/lib/auth/reset-actions";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { errors, clearFieldError, showErrors } = useFieldErrors();
  const { guard, reset } = useSubmitGuard();

  const handleSubmit = guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const nextErrors = {
      password: password.length >= 8 ? undefined : "Use at least 8 characters.",
      confirm:
        password && password === confirm ? undefined : confirm ? "Those passwords don't match." : "Re-enter your new password.",
    };
    if (showErrors(nextErrors, ["password", "confirm"])) {
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
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError("password");
          }}
          placeholder="At least 8 characters"
        />
        <FieldError id="password-error">{errors.password}</FieldError>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          aria-invalid={errors.confirm ? true : undefined}
          aria-describedby={errors.confirm ? "confirm-error" : undefined}
          onChange={(e) => {
            setConfirm(e.target.value);
            clearFieldError("confirm");
          }}
        />
        <FieldError id="confirm-error">{errors.confirm}</FieldError>
      </div>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Save new password"}
      </Button>
    </form>
  );
}
