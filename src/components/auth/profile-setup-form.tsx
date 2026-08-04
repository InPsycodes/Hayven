"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AvatarUploadDropzone } from "@/components/shared/avatar-upload-dropzone";
import { AreasOfFocusChips } from "@/components/auth/areas-of-focus-chips";
import { WeeklyAvailabilityGrid } from "@/components/auth/weekly-availability-grid";
import { saveProfileStep, type FormState } from "@/lib/therapist/actions";

const UNDERLINE_INPUT =
  "rounded-none border-0 border-b border-input bg-transparent px-0 focus-visible:ring-0 focus-visible:border-charcoal";

const initialState: FormState = {};

export function ProfileSetupForm() {
  const [state, formAction, isPending] = useActionState(saveProfileStep, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex items-center gap-4">
        <AvatarUploadDropzone />
        <p className="text-sm text-muted-foreground">
          A clear headshot builds parent trust faster than any bio text.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Short bio</Label>
        <Textarea
          id="bio"
          name="bio"
          required
          placeholder="Tell parents about your approach, experience, and who you work best with..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="price">Session price (₦)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            required
            className={UNDERLINE_INPUT}
            placeholder="15000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            className={UNDERLINE_INPUT}
            placeholder="Lekki, Lagos"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Session type</Label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <Checkbox name="inPerson" defaultChecked />
            In-person
          </label>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <Checkbox name="virtual" defaultChecked />
            Virtual
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Areas of focus</Label>
        <AreasOfFocusChips initial={["Developmental Psychology", "Speech Therapy"]} />
        <p className="text-xs text-muted-foreground">
          Shown on your public profile. Fine-tune this anytime after approval.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Weekly availability</Label>
        <WeeklyAvailabilityGrid />
        <p className="text-xs text-muted-foreground">
          You&apos;ll set exact bookable time slots from your calendar once approved.
        </p>
      </div>

      {state.error && <p className="text-sm text-error">{state.error}</p>}

      <Button type="submit" variant="accent" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Submitting..." : "Submit for review"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Your profile stays hidden from parents until Hayven approves your credentials.
      </p>
    </form>
  );
}
