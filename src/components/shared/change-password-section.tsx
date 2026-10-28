"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, type ChangePasswordState } from "@/lib/auth/password-actions";

const initialState: ChangePasswordState = {};

export function ChangePasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, isPending] = useActionState(async (prev: ChangePasswordState, formData: FormData) => {
    const result = await changePassword(prev, formData);
    if (result.done) setExpanded(false);
    return result;
  }, initialState);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div>
        <h2 className="font-heading text-base text-charcoal">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasPassword
            ? "Changing it signs you out on any other devices."
            : "You sign in with Google, so there's no Hayven password to change. Your Google account's security protects this account."}
        </p>
      </div>

      {!hasPassword ? null : expanded ? (
        <form action={formAction} className="reveal flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
          </div>

          {state.error && <p className="text-sm text-error-text">{state.error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending ? "Saving..." : "Save new password"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setExpanded(false)} className="w-fit">
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setExpanded(true)} className="w-fit">
            Change password
          </Button>
          {state.done && <p className="fade-in text-sm text-success-text">Password changed.</p>}
        </div>
      )}
    </Card>
  );
}
