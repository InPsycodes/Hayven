"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";

export function AreasOfFocusChips({ initial }: { initial: string[] }) {
  const [areas, setAreas] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const value = draft.trim();
    if (value) setAreas((prev) => [...prev, value]);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {areas.map((area) => (
        <Chip key={area} variant="filled" onRemove={() => setAreas((prev) => prev.filter((a) => a !== area))}>
          {area}
        </Chip>
      ))}
      {adding ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          placeholder="Add area"
          className="h-7 w-32 rounded-full px-3 text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-charcoal/40 hover:text-charcoal"
        >
          <IconPlus size={12} stroke={2} />
          Add area
        </button>
      )}
    </div>
  );
}
