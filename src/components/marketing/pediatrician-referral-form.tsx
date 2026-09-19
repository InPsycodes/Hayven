"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";
import { cn } from "@/lib/utils";
import { submitReferral, type FormState } from "@/lib/referrals/actions";
import { REFERRAL_REASON_TAGS } from "@/lib/referrals/constants";

const initialState: FormState = {};

export function PediatricianReferralForm() {
  const [state, formAction, isPending] = useActionState(submitReferral, initialState);
  const [reasonTags, setReasonTags] = useState<string[]>([]);

  const fieldError = (name: string) => (state.field === name ? state.error : undefined);

  function toggleTag(tag: string) {
    setReasonTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  if (state.referenceCode) {
    return (
      <div className="reveal mx-auto flex w-full max-w-[640px] flex-col items-center gap-3 rounded-2xl border border-offwhite bg-canvas-white p-10 text-center shadow-[0_1px_2px_rgba(26,26,26,.04),0_10px_24px_-16px_rgba(26,26,26,.22)]">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success-text">
          <IconCheck size={22} stroke={2} />
        </span>
        <h2 className="font-heading text-xl text-charcoal">Referral received</h2>
        <p className="max-w-sm text-sm text-ink-soft">
          We&apos;ll reach out to the family within one business day. Save this code to check status any time.
        </p>
        <div className="mt-1 rounded-md border border-dashed border-terracotta/40 bg-offwhite/40 px-5 py-2.5 font-mono text-lg font-semibold text-terracotta">
          {state.referenceCode}
        </div>
        <p className="text-xs text-muted-foreground">Also sent to your email, if you gave us one.</p>
        <Link href="/pediatricians/status" className="mt-2 text-sm font-medium text-rust-dark hover:underline">
          Track this referral
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <h1 className="font-heading text-[1.9rem] text-charcoal">Refer a child to Hayven</h1>
      <p className="mt-2 mb-9 text-sm text-ink-soft">
        This isn&apos;t shared with the family until you submit. Takes about a minute.
      </p>

      <form
        action={formAction}
        className="flex flex-col gap-6 rounded-2xl border border-offwhite bg-canvas-white p-10 shadow-[0_1px_2px_rgba(26,26,26,.04),0_10px_24px_-16px_rgba(26,26,26,.22)]"
      >
      <fieldset className="flex flex-col gap-4">
        <legend className="label-micro w-full border-b border-offwhite pb-3.5 text-rust-dark">Child</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="childName">Child&apos;s name</Label>
            <Input
              id="childName"
              name="childName"
              required
              placeholder="e.g. Zainab O."
              aria-invalid={fieldError("childName") ? true : undefined}
              aria-describedby={fieldError("childName") ? "childName-error" : undefined}
            />
            <FieldError id="childName-error">{fieldError("childName")}</FieldError>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="childAge">Age</Label>
            <Input
              id="childAge"
              name="childAge"
              type="number"
              inputMode="numeric"
              min={0}
              max={25}
              required
              placeholder="e.g. 4"
              aria-invalid={fieldError("childAge") ? true : undefined}
              aria-describedby={fieldError("childAge") ? "childAge-error" : undefined}
            />
            <FieldError id="childAge-error">{fieldError("childAge")}</FieldError>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="parentContact">Parent/guardian contact</Label>
          <Input
            id="parentContact"
            name="parentContact"
            required
            placeholder="Phone or email we can reach them on"
            aria-invalid={fieldError("parentContact") ? true : undefined}
            aria-describedby={fieldError("parentContact") ? "parentContact-error" : undefined}
          />
          <FieldError id="parentContact-error">{fieldError("parentContact")}</FieldError>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="label-micro w-full border-b border-offwhite pb-3.5 text-rust-dark">You</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="referrerName">Your name</Label>
            <Input
              id="referrerName"
              name="referrerName"
              required
              placeholder="Dr. ..."
              aria-invalid={fieldError("referrerName") ? true : undefined}
              aria-describedby={fieldError("referrerName") ? "referrerName-error" : undefined}
            />
            <FieldError id="referrerName-error">{fieldError("referrerName")}</FieldError>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="referrerFacility">Facility</Label>
            <Input id="referrerFacility" name="referrerFacility" placeholder="Clinic / hospital" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="referrerSpecialty">Specialty</Label>
            <Input id="referrerSpecialty" name="referrerSpecialty" placeholder="e.g. Pediatrics" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="referrerContact">Your contact</Label>
            <Input
              id="referrerContact"
              name="referrerContact"
              required
              placeholder="Phone or email"
              aria-invalid={fieldError("referrerContact") ? true : undefined}
              aria-describedby={fieldError("referrerContact") ? "referrerContact-error" : undefined}
            />
            <FieldError id="referrerContact-error">{fieldError("referrerContact")}</FieldError>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="label-micro w-full border-b border-offwhite pb-3.5 text-rust-dark">Reason for referral</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-describedby={fieldError("reasonTags") ? "reasonTags-error" : undefined}>
          {REFERRAL_REASON_TAGS.map((tag) => {
            const on = reasonTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "border-terracotta bg-terracotta text-white"
                    : "border-charcoal/15 bg-canvas-white text-ink-soft hover:border-charcoal/30"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <FieldError id="reasonTags-error">{fieldError("reasonTags")}</FieldError>
        {reasonTags.map((tag) => (
          <input key={tag} type="hidden" name="reasonTags" value={tag} />
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="additionalInfo">Additional information (optional)</Label>
        <Textarea
          id="additionalInfo"
          name="additionalInfo"
          rows={3}
          placeholder="Anything else worth knowing before we reach out"
        />
      </div>

      {state.error && !state.field && <p className="text-sm text-error-text">{state.error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Submitting..." : "Submit referral"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        We&apos;ll send you a reference code to track this referral.
      </p>
      </form>
    </div>
  );
}
