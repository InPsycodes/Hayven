import Link from "next/link";

import { StepHeader } from "@/components/shared/step-header";
import { ConfirmationPanel } from "@/components/shared/confirmation-panel";
import { Button } from "@/components/ui/button";

export default function SignupCompletePage() {
  return (
    <div>
      <StepHeader
        title="Application submitted"
        subtitle="Step 3 of 3 -- Under review"
        step={3}
        totalSteps={3}
      />
      <ConfirmationPanel
        heading="Thanks -- we've got your application"
        subtext="Hayven will confirm your membership status directly with your professional body. This typically takes 2-5 business days. Your profile stays hidden from parents until then."
        actions={
          <>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">Back to home</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/login">Log in</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
