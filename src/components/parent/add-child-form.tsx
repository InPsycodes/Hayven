"use client";

import { useActionState, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addChild, type FormState } from "@/lib/parent/actions";

const initialState: FormState = {};

export function AddChildForm() {
  const [state, formAction, isPending] = useActionState(addChild, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <h2 className="font-heading text-base text-charcoal">Add a child</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required placeholder="Zara" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="presentingConcern">What&apos;s going on? (optional)</Label>
        <Textarea
          id="presentingConcern"
          name="presentingConcern"
          rows={3}
          placeholder="e.g. Speech delay, mostly around forming full sentences."
        />
      </div>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Adding..." : "Add child"}
      </Button>
    </form>
  );
}
