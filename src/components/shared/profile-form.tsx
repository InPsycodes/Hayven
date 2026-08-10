"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccountProfile, type FormState } from "@/lib/account/actions";

const initialState: FormState = {};

export function ProfileForm({
  initialFullName,
  initialPhone,
}: {
  initialFullName: string;
  initialPhone: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateAccountProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-sm bg-white p-5 ring-1 ring-border">
      <h2 className="font-heading text-base text-charcoal">Account details</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required defaultValue={initialFullName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initialPhone ?? ""}
          placeholder="+234 800 000 0000"
        />
      </div>

      {state.error && <p className="text-sm text-error">{state.error}</p>}
      {!state.error && state !== initialState && (
        <p className="fade-in text-sm text-success">Saved.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
