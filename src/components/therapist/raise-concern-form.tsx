"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { raiseSafeguardingConcern, type RaiseConcernState } from "@/lib/safeguarding/actions";
import { cn } from "@/lib/utils";

const initialState: RaiseConcernState = {};

export function RaiseConcernForm({ caseload }: { caseload: { id: string; firstName: string }[] }) {
  const [state, formAction, isPending] = useActionState(raiseSafeguardingConcern, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="childId">Which child is this about?</Label>
        <select
          id="childId"
          name="childId"
          defaultValue=""
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-charcoal focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <option value="">Not a specific child on my caseload</option>
          {caseload.map((child) => (
            <option key={child.id} value={child.id}>
              {child.firstName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">What did you see or hear?</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={6}
          maxLength={5000}
          placeholder="Write down what you saw or heard, when, and the child's own words if they said something. Facts only, no interpretation."
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-charcoal">
        <input type="checkbox" name="immediateDanger" className="mt-0.5 size-4 shrink-0 accent-[var(--error)]" />
        <span>
          <span className="font-medium">The child may be in danger right now.</span>{" "}
          <span className="text-muted-foreground">Phone the DSL as well. Don&apos;t rely on this form alone.</span>
        </span>
      </label>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-(--duration-press) ease-(--ease-out)",
          state.ok ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <p className="overflow-hidden text-sm text-success-text">
          Logged and sent to the safeguarding lead. You&apos;ll be told here once it&apos;s been actioned.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Sending..." : "Send to the safeguarding lead"}
      </Button>
    </form>
  );
}
