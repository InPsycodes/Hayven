"use client";

import { useState, useTransition } from "react";
import { IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealLearningCategory, LearningAudience } from "@/lib/learning/queries";
import { createLearningCategory, deleteLearningCategory } from "@/lib/learning/actions";

export function LearningCategoryManager({ categories }: { categories: RealLearningCategory[] }) {
  const [list, setList] = useState(categories);
  const [name, setName] = useState("");
  const [audience, setAudience] = useState<LearningAudience>("parent");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const addGuard = useSubmitGuard();

  const handleAdd = addGuard.guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createLearningCategory(name, audience);
      if (!result.ok) {
        setError(result.error);
        addGuard.reset();
        return;
      }
      setList((prev) => [...prev, { id: result.id, name: name.trim(), audience, sortOrder: prev.length }]);
      setName("");
      addGuard.reset();
    });
  });

  async function handleRemove(id: string) {
    if (!confirm("Remove this category? Articles using it will show as uncategorized.")) return;
    const result = await deleteLearningCategory(id);
    if (result.ok) setList((prev) => prev.filter((c) => c.id !== id));
    else setError(result.error);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="label-micro text-muted-foreground">New category</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sensory processing" className="w-56" />
        </div>
        <Select value={audience} onValueChange={(v) => setAudience(v as LearningAudience)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parent">Parent</SelectItem>
            <SelectItem value="therapist">Therapist</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" variant="accent" disabled={isPending}>
          Add
        </Button>
      </form>
      {error && <p className="text-xs text-error-text">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1.5 rounded-full bg-[#F6F4F0] px-3 py-1.5 text-xs text-charcoal"
          >
            {c.name}
            <span className="text-muted-foreground">({c.audience})</span>
            <button
              type="button"
              onClick={() => handleRemove(c.id)}
              aria-label={`Remove ${c.name}`}
              className="rounded-full text-muted-foreground outline-none hover:text-error-text focus-visible:ring-2 focus-visible:ring-terracotta/40"
            >
              <IconX size={12} stroke={2} />
            </button>
          </span>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">No categories yet.</p>}
      </div>
    </div>
  );
}
