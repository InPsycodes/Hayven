"use client";

import { useState, useTransition } from "react";

import { Block } from "@/components/therapy-session/report-view";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { saveReport } from "@/lib/reports/actions";
import type { ReportBlock, ReportBody } from "@/lib/reports/types";

const READ_ONLY_SECTIONS = new Set(["data_summary"]);

function blockToText(block: ReportBlock): string {
  if (block.type === "paragraph" || block.type === "quote") return block.text ?? "";
  if (block.type === "bullets") return (block.items ?? []).map((i) => `- ${i}`).join("\n");
  return "";
}

/** Edits each block's own text/items in place, preserving its type and label (e.g. a clinical_interpretation section's per-domain headings), instead of flattening the whole section into one paragraph. */
function textToBlock(block: ReportBlock, text: string): ReportBlock {
  if (block.type === "bullets") {
    const items = text
      .split("\n")
      .map((line) => line.trim().replace(/^-\s*/, ""))
      .filter((line) => line.length > 0);
    return { ...block, items };
  }
  return { ...block, text };
}

export function ReportEditor({ reportId, body }: { reportId: string; body: ReportBody }) {
  const [texts, setTexts] = useState<Record<string, string[]>>(
    Object.fromEntries(
      body.sections.filter((s) => !READ_ONLY_SECTIONS.has(s.key)).map((s) => [s.key, s.blocks.map(blockToText)])
    )
  );
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const { guard, reset } = useSubmitGuard();

  const handleSave = guard(() => {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const editedBody: ReportBody = {
        ...body,
        sections: body.sections.map((section) =>
          READ_ONLY_SECTIONS.has(section.key)
            ? section
            : {
                key: section.key,
                heading: section.heading,
                blocks: section.blocks.map((block, i) => textToBlock(block, texts[section.key]?.[i] ?? "")),
              }
        ),
      };
      const result = await saveReport(reportId, editedBody);
      reset(); // a draft report is saved repeatedly, not a one-time submit
      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }
      setStatus("saved");
    });
  });

  return (
    <div className="flex flex-col gap-5">
      {body.sections.map((section) =>
        READ_ONLY_SECTIONS.has(section.key) ? (
          <div key={section.key} className="flex flex-col gap-3 rounded-sm bg-white p-4 ring-1 ring-border">
            <Label>{section.heading}</Label>
            <p className="text-xs text-muted-foreground">Computed from recorded session data, not directly editable.</p>
            <div className="flex flex-col gap-3">
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>
          </div>
        ) : (
          <div key={section.key} className="flex flex-col gap-3 rounded-sm bg-white p-4 ring-1 ring-border">
            <Label>{section.heading}</Label>
            {section.blocks.map((block, i) => (
              <div key={i} className="flex flex-col gap-1">
                {block.label && (
                  <Label htmlFor={`section-${section.key}-${i}`} className="text-xs text-muted-foreground">
                    {block.label}
                  </Label>
                )}
                <Textarea
                  id={`section-${section.key}-${i}`}
                  rows={block.type === "bullets" ? Math.max(3, (block.items?.length ?? 1) + 1) : 5}
                  value={texts[section.key]?.[i] ?? ""}
                  onChange={(e) => {
                    setTexts((prev) => {
                      const next = [...(prev[section.key] ?? [])];
                      next[i] = e.target.value;
                      return { ...prev, [section.key]: next };
                    });
                    setStatus("idle");
                  }}
                />
              </div>
            ))}
          </div>
        )
      )}

      {error && <p className="text-sm text-error-text">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save report"}
        </Button>
        {status === "saved" && <span className="fade-in text-sm text-success-text">Saved.</span>}
      </div>
    </div>
  );
}
