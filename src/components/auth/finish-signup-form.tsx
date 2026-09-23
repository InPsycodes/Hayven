"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { finishGoogleSignup } from "@/lib/auth/google-actions";

export function FinishSignupForm({ initialName, next }: { initialName: string; next: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await finishGoogleSignup({ fullName, phone, agreedToTerms: agreed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-xl text-charcoal">One last step</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re signed in with Google. Confirm your name and add a phone number so your therapist can reach you.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="finishName">Full name</Label>
        <Input id="finishName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="finishPhone">Phone</Label>
        <Input
          id="finishPhone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+234 800 000 0000"
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} className="mt-0.5" />
        <span>
          I agree to Hayven&apos;s{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-rust-dark hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" target="_blank" className="font-medium text-rust-dark hover:underline">
            Terms of Service
          </Link>
          .
        </span>
      </label>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <Button type="submit" size="lg" disabled={isPending || !agreed} className="w-full">
        {isPending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
