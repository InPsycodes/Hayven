"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Same category vocabulary the report generator's pattern detection groups
// by -- keeping the dropdown and the generator's ANTECEDENT_PATTERN_KEYWORDS
// in sync is what makes exact (not keyword-guessed) pattern matching work.
const ANTECEDENT_CATEGORIES = [
  { value: "", label: "Not recorded" },
  { value: "transition", label: "Transition between activities" },
  { value: "denied", label: "Denied access / told no" },
  { value: "non_preferred", label: "Non-preferred task demand" },
  { value: "attention", label: "Attention removed or withdrawn" },
  { value: "peer", label: "Peer interaction" },
  { value: "wait", label: "Asked to wait" },
  { value: "other", label: "Other / unclear" },
];

/** Repeatable ABC (antecedent-behaviour-consequence) observation rows -- same indexed-FormData pattern as the fixed reinforcer slots, just dynamically add-able. Rows with no behaviour label are ignored server-side, so removing a row is just clearing its label. */
export function AbcObservationBuilder() {
  const [rowCount, setRowCount] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <Label>Behavioural observations (ABC)</Label>
      <input type="hidden" name="abcCount" value={rowCount} />

      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-sm bg-white p-4 ring-1 ring-border">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`abc_${i}_behaviourLabel`} className="text-xs">
                Behaviour
              </Label>
              <Input id={`abc_${i}_behaviourLabel`} name={`abc_${i}_behaviourLabel`} placeholder="e.g. Ear blocking" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`abc_${i}_antecedentCategory`} className="text-xs">
                Antecedent category
              </Label>
              <select
                id={`abc_${i}_antecedentCategory`}
                name={`abc_${i}_antecedentCategory`}
                className="h-9 rounded-sm border border-border bg-white px-2 text-sm"
                defaultValue=""
              >
                {ANTECEDENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`abc_${i}_antecedent`} className="text-xs">
                Antecedent detail (optional)
              </Label>
              <Input
                id={`abc_${i}_antecedent`}
                name={`abc_${i}_antecedent`}
                placeholder="Anything specific worth noting"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`abc_${i}_behaviourObserved`} className="text-xs">
                Behaviour observed
              </Label>
              <Input
                id={`abc_${i}_behaviourObserved`}
                name={`abc_${i}_behaviourObserved`}
                placeholder="What the child actually did"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`abc_${i}_consequence`} className="text-xs">
                Consequence
              </Label>
              <Input
                id={`abc_${i}_consequence`}
                name={`abc_${i}_consequence`}
                placeholder="How the therapist responded"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`abc_${i}_outcome`} className="text-xs">
                Outcome
              </Label>
              <Input id={`abc_${i}_outcome`} name={`abc_${i}_outcome`} placeholder="What happened after" />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setRowCount((n) => n + 1)}>
        + Add another ABC observation
      </Button>
    </div>
  );
}
