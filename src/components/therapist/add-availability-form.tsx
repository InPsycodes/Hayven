"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAvailabilitySlot, type FormState } from "@/lib/therapist/actions";

const initialState: FormState = {};

export function AddAvailabilityForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addAvailabilitySlot, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Adjusting state during render on a prop/state change, per React's
  // documented pattern -- avoids the cascading-render setState-in-effect.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (!state.error && open) {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  if (!open) {
    return (
      <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
        <IconPlus size={14} stroke={2} />
        Add availability
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex w-full flex-col gap-4 rounded-sm bg-card p-5 ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base text-charcoal">Add availability</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-muted-foreground hover:text-charcoal"
        >
          <IconX size={16} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="time" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" name="endTime" type="time" required />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Session type</Label>
        <div className="flex gap-4 text-sm text-charcoal">
          <label className="flex items-center gap-2">
            <input type="radio" name="sessionType" value="virtual" defaultChecked required />
            Virtual
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="sessionType" value="in_person" />
            In-person
          </label>
        </div>
      </div>

      {state.error && <p className="text-sm text-error-text">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Adding..." : "Add slot"}
      </Button>
    </form>
  );
}
