"use client";

import { useActionState } from "react";
import Link from "next/link";
import { IconInfoCircle } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDropzone } from "@/components/shared/upload-dropzone";
import { saveCredentialsStep, type FormState } from "@/lib/therapist/actions";
import { PROFESSIONAL_BODIES } from "@/lib/therapist/professional-bodies";
import type { Specialty } from "@/data/types";
import { THERAPIST_AGREEMENT } from "@/content/therapist-agreement";

const UNDERLINE_INPUT =
  "rounded-none border-0 border-b border-input bg-transparent px-0 focus-visible:ring-0 focus-visible:border-charcoal";

const initialState: FormState = {};

export function CredentialsForm({ specialties }: { specialties: Specialty[] }) {
  const [state, formAction, isPending] = useActionState(saveCredentialsStep, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6 p-6 md:p-8">
      {/* Uncontrolled + keyed off the server's echoed-back value, not a
          controlled value/onValueChange pair -- on a failed submit (e.g.
          an invalid file), a controlled Select here was resetting to its
          placeholder on the useActionState re-render while the plain
          <Input> fields survived untouched, forcing a second, unrelated
          "please select your specialty" error on resubmit. Re-deriving
          local state from `state` (via useState-adjust-during-render, and
          separately via useEffect) both failed to hold -- something in
          this re-render clears it moments later either way. Keying the
          Select on the value itself sidesteps the mystery entirely: a
          changed key forces a clean remount with the right defaultValue,
          no controlled-state reconciliation involved. */}
      <div className="flex flex-col gap-2">
        <Label>Specialty</Label>
        <Select
          key={`specialty-${state.specialtyId ?? ""}`}
          name="specialtyId"
          defaultValue={state.specialtyId}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select your specialty" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Professional body / association</Label>
        <Select
          key={`professional-body-${state.professionalBody ?? ""}`}
          name="professionalBody"
          defaultValue={state.professionalBody}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select your professional body" />
          </SelectTrigger>
          <SelectContent>
            {PROFESSIONAL_BODIES.map((body) => (
              <SelectItem key={body.value} value={body.value}>
                {body.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          e.g. Nigerian Psychological Association, Nigerian Assoc. of Clinical Psychologists,
          Assoc. of Nigerian Educational Psychologists, or your specialty&apos;s equivalent.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="membershipNumber">Membership / license number</Label>
          <Input
            id="membershipNumber"
            name="membershipNumber"
            required
            className={UNDERLINE_INPUT}
            placeholder="NPA-22841"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="yearsPracticing">Years practicing</Label>
          <Input
            id="yearsPracticing"
            name="yearsPracticing"
            required
            type="number"
            min={0}
            className={UNDERLINE_INPUT}
            placeholder="8"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Upload certificate / membership document</Label>
        <UploadDropzone name="file" required />
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <div>
          <h2 className="font-heading text-base text-charcoal">Professional indemnity insurance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Required to practise on Hayven. Upload your current certificate showing the insurer and when your cover ends.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="insurer">Insurer</Label>
            <Input id="insurer" name="insurer" required className={UNDERLINE_INPUT} placeholder="e.g. Leadway Assurance" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="policyNumber">Policy number (optional)</Label>
            <Input id="policyNumber" name="policyNumber" className={UNDERLINE_INPUT} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="insuranceExpiresOn">Cover ends on</Label>
            <Input id="insuranceExpiresOn" name="insuranceExpiresOn" type="date" required className={UNDERLINE_INPUT} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Upload insurance certificate</Label>
          <UploadDropzone name="insuranceFile" required />
        </div>
      </div>

      {THERAPIST_AGREEMENT && (
        <label className="flex items-start gap-2.5 text-sm text-charcoal">
          <input type="checkbox" name="acceptAgreement" required className="mt-0.5 size-4 shrink-0 accent-[var(--terracotta)]" />
          <span>
            I have read and agree to the{" "}
            <Link href="/therapist-agreement" target="_blank" className="font-medium text-terracotta underline">
              Therapist Agreement
            </Link>{" "}
            (version {THERAPIST_AGREEMENT.version}).
          </span>
        </label>
      )}

      <div className="flex items-start gap-2.5 rounded-sm bg-paper p-4">
        <IconInfoCircle size={18} stroke={1.75} className="mt-0.5 shrink-0 text-charcoal" />
        <p className="text-sm text-charcoal">
          Hayven manually confirms your membership status directly with your professional body
          before approval. This typically takes 2-5 business days.
        </p>
      </div>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}

      <div className="flex gap-3">
        <Button asChild type="button" variant="outline" className="flex-1">
          <Link href="/signup">Back</Link>
        </Button>
        <Button type="submit" disabled={isPending} className="flex-[2]">
          {isPending ? "Saving..." : "Continue to profile setup"}
        </Button>
      </div>
    </form>
  );
}
