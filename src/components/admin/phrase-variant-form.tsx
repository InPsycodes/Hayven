"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PHRASE_DOMAINS } from "@/lib/reports/phrase-domains";

export function PhraseVariantForm({
  onSubmit,
}: {
  onSubmit: (
    domainKey: string,
    band: string | null,
    tone: "warm" | "direct",
    phrase: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [domainKey, setDomainKey] = useState(PHRASE_DOMAINS[0].key);
  const [band, setBand] = useState<string | null>(PHRASE_DOMAINS[0].bands?.[0]?.key ?? null);
  const [tone, setTone] = useState<"warm" | "direct">("warm");
  const [phrase, setPhrase] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const domain = useMemo(() => PHRASE_DOMAINS.find((d) => d.key === domainKey)!, [domainKey]);

  function handleDomainChange(key: string) {
    const next = PHRASE_DOMAINS.find((d) => d.key === key)!;
    setDomainKey(key);
    setBand(next.bands?.[0]?.key ?? null);
  }

  function handleSubmit() {
    if (!phrase.trim()) {
      setError("Enter a phrase.");
      return;
    }
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await onSubmit(domainKey, band, tone, phrase);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhrase("");
      setSuccess(true);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm bg-[#F6F4F0] p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label className="label-micro text-muted-foreground">Domain</Label>
          <Select value={domainKey} onValueChange={handleDomainChange}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHRASE_DOMAINS.map((d) => (
                <SelectItem key={d.key} value={d.key}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {domain.bands && (
          <div className="flex flex-col gap-1.5">
            <Label className="label-micro text-muted-foreground">Band</Label>
            <Select value={band ?? undefined} onValueChange={setBand}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {domain.bands.map((b) => (
                  <SelectItem key={b.key} value={b.key}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label className="label-micro text-muted-foreground">Tone</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as "warm" | "direct")}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="label-micro text-muted-foreground">Phrase</Label>
        <Textarea
          rows={2}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder={`Use {{CHILD}} wherever the child's name should appear, e.g. "{{CHILD}} is really getting the hang of this!"`}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={isPending} variant="accent" className="w-fit">
          {isPending ? "Adding..." : "Add phrase"}
        </Button>
        {error && <p className="text-sm text-error">{error}</p>}
        {success && <p className="fade-in text-sm text-success">Added.</p>}
      </div>
    </div>
  );
}
