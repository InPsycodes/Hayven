"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { UploadDropzone } from "@/components/shared/upload-dropzone";
import { uploadInsuranceCertificate, type FormState } from "@/lib/therapist/actions";
import type { InsuranceCover } from "@/lib/therapist/agreement";
import { insuranceCoverState, type InsuranceCoverState } from "@/lib/therapist/insurance-status";
import { formatDate } from "@/data/format";

const initialState: FormState = {};

const COVER_BADGE: Record<InsuranceCoverState, { label: string; tone: "sage" | "amber" | "error" }> = {
  missing: { label: "Not uploaded", tone: "error" },
  expired: { label: "Expired", tone: "error" },
  ending_soon: { label: "Ends soon", tone: "amber" },
  current: { label: "Current", tone: "sage" },
};

export function TherapistInsuranceCard({ current }: { current: InsuranceCover | null }) {
  const [state, formAction, isPending] = useActionState(uploadInsuranceCertificate, initialState);
  const status = COVER_BADGE[insuranceCoverState(current?.expiresOn)];

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base text-charcoal">Professional indemnity insurance</h2>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        Required to practise on Hayven. Upload your new certificate when you renew, before your current cover ends.
      </p>

      {current && (
        <p className="rounded-sm bg-inset px-3 py-2 text-xs text-charcoal">
          <span className="font-medium">{current.insurer}</span>
          {current.policyNumber ? ` · policy ${current.policyNumber}` : ""} · cover ends {formatDate(current.expiresOn)}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ins-insurer">Insurer</Label>
          <Input id="ins-insurer" name="insurer" required defaultValue={current?.insurer} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ins-policy">Policy number (optional)</Label>
          <Input id="ins-policy" name="policyNumber" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ins-expires">Cover ends on</Label>
          <Input id="ins-expires" name="insuranceExpiresOn" type="date" required />
        </div>
      </div>
      <UploadDropzone name="insuranceFile" required />

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}
      {!state.error && state !== initialState && (
        <p className="fade-in text-sm text-success-text">Certificate saved.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Uploading..." : current ? "Upload renewed certificate" : "Upload certificate"}
      </Button>
    </form>
  );
}
