"use client";

import { useActionState, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";
import { addChild, type FormState } from "@/lib/parent/actions";

const initialState: FormState = {};

export function AddChildForm() {
  const [state, formAction, isPending] = useActionState(addChild, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) {
      formRef.current?.reset();
      return;
    }
    // Keep what the parent typed; just move them to the field that needs fixing.
    if (state.field) {
      const el = document.getElementById(state.field);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement).focus({ preventScroll: true });
      }
    }
  }, [state]);

  const fieldError = (name: FormState["field"]) => (state.field === name ? state.error : undefined);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <h2 className="font-heading text-base text-charcoal">Add a child</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            placeholder="Zara"
            aria-invalid={fieldError("firstName") ? true : undefined}
            aria-describedby={fieldError("firstName") ? "firstName-error" : undefined}
          />
          <FieldError id="firstName-error">{fieldError("firstName")}</FieldError>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            aria-invalid={fieldError("dateOfBirth") ? true : undefined}
            aria-describedby={fieldError("dateOfBirth") ? "dateOfBirth-error" : undefined}
          />
          <FieldError id="dateOfBirth-error">{fieldError("dateOfBirth")}</FieldError>
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

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <Checkbox
          id="guardianConsent"
          name="guardianConsent"
          required
          aria-invalid={fieldError("guardianConsent") ? true : undefined}
          aria-describedby={fieldError("guardianConsent") ? "guardianConsent-error" : undefined}
          className="mt-0.5"
        />
        <span>
          I confirm I&apos;m this child&apos;s parent or legal guardian (or otherwise have
          parental responsibility for them), and I consent to Hayven processing what I share
          here, including any health or developmental information, to arrange and provide care.
        </span>
      </label>
      <FieldError id="guardianConsent-error">{fieldError("guardianConsent")}</FieldError>

      {state.error && !state.field && <p className="text-sm text-error-text">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Adding..." : "Add child"}
      </Button>
    </form>
  );
}
