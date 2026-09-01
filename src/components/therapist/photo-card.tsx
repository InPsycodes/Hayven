"use client";

import { useActionState } from "react";

import { AvatarUploadDropzone } from "@/components/shared/avatar-upload-dropzone";
import { TherapistAvatar } from "@/components/shared/therapist-avatar";
import { Button } from "@/components/ui/button";
import { updateTherapistPhoto, type FormState } from "@/lib/therapist/actions";

const initialState: FormState = {};

export function TherapistPhotoCard({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [state, formAction, isPending] = useActionState(updateTherapistPhoto, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <h2 className="font-heading text-base text-charcoal">Profile photo</h2>
      <p className="-mt-1 text-xs text-muted-foreground">
        Shown on your public profile and in search results. JPG or PNG, under 2.5MB.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <TherapistAvatar name={name} photoUrl={photoUrl} size={72} fallbackClassName="bg-paper text-charcoal" />
        <AvatarUploadDropzone />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Uploading..." : "Save photo"}
        </Button>
      </div>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}
      {!state.error && state !== initialState && <p className="fade-in text-sm text-success-text">Photo updated.</p>}
    </form>
  );
}
