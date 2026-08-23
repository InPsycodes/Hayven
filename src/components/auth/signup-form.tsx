"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { signUp } from "@/lib/auth/actions";

type SignupRole = "parent" | "therapist";

export function SignupForm({
  role,
  onRoleChange,
}: {
  role: SignupRole;
  onRoleChange: (role: SignupRole) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { guard, reset } = useSubmitGuard();

  const handleSubmit = guard((e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError("Please agree to the Privacy Policy and Terms of Service to continue.");
      reset();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await signUp({
        role,
        fullName: `${firstName} ${lastName}`.trim(),
        email,
        phone,
        password,
        agreedToTerms,
      });

      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      if (result.needsEmailConfirmation) {
        setNeedsConfirmation(true);
        return;
      }

      router.push(role === "therapist" ? "/signup/credentials" : "/parent");
      router.refresh();
    });
  });

  if (needsConfirmation) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h2 className="font-heading text-xl text-charcoal">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-charcoal">{email}</span>.
          Click it, then log in to continue.
        </p>
        <Link href="/login" className="mt-2 text-sm font-medium text-rust-dark hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex rounded-full bg-charcoal/5 p-1">
        {(["parent", "therapist"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRoleChange(r)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              role === r ? "bg-charcoal text-offwhite" : "text-charcoal/70"
            )}
          >
            {r === "parent" ? "I'm a parent" : "I'm a therapist"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Amaka"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Obi"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signupEmail">Email</Label>
        <Input
          id="signupEmail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+234 800 000 0000"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signupPassword">Password</Label>
        <Input
          id="signupPassword"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <Checkbox
          checked={agreedToTerms}
          onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
          className="mt-0.5"
        />
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

      <Button
        type="submit"
        size="lg"
        variant={role === "therapist" ? "accent" : "default"}
        disabled={isPending}
        className="w-full"
      >
        {isPending && <IconLoader2 size={16} stroke={2} className="animate-spin" />}
        {isPending
          ? "Creating your account..."
          : role === "therapist"
            ? "Continue to credentials →"
            : "Create account"}
      </Button>
      {isPending && (
        <p className="fade-in -mt-2 text-center text-xs text-muted-foreground">
          This can take a few seconds. Please don&apos;t close this window.
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {role === "therapist" ? "Already applied?" : "Already have an account?"}{" "}
        <Link href="/login" className="font-medium text-rust-dark hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
