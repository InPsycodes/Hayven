"use client";

import { useState, useTransition } from "react";

import { Block } from "@/components/therapy-session/report-view";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveReport } from "@/lib/reports/actions";
import type { ReportBlock, ReportBody, ReportSection } from "@/lib/reports/types";

const READ_ONLY_SECTIONS = new Set(["data_summary"]);

function sectionToText(section: ReportSection): string {
  return section.blocks
    .map((block) => {
      if (block.type === "paragraph" || block.type === "quote") return block.text ?? "";
      if (block.type === "bullets") return (block.items ?? []).map((i) => `- ${i}`).join("\n");
      return "";
    })
    .join("\n\n");
}

/** Round-trips a bulleted section back into bullets instead of flattening it into one paragraph, so editing "Recommendations" doesn't lose its list structure. */
function textToBlocks(section: ReportSection, text: string): ReportBlock[] {
  const wasBullets = section.blocks.some((b) => b.type === "bullets");
  if (!wasBullets) return [{ type: "paragraph", text }];

  const items = text
    .split("\n")
    .map((line) => line.trim().replace(/^-\s*/, ""))
    .filter((line) => line.length > 0);
  return [{ type: "bullets", items }];
}

export function ReportEditor({ reportId, body }: { reportId: string; body: ReportBody }) {
  const [texts, setTexts] = useState<Record<string, string>>(
    Object.fromEntries(
      body.sections.filter((s) => !READ_ONLY_SECTIONS.has(s.key)).map((s) => [s.key, sectionToText(s)])
    )
  );
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
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
                blocks: textToBlocks(section, texts[section.key] ?? ""),
              }
        ),
      };
      const result = await saveReport(reportId, editedBody);
      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }
      setStatus("saved");
    });
  }

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
          <div key={section.key} className="flex flex-col gap-2 rounded-sm bg-white p-4 ring-1 ring-border">
            <Label htmlFor={`section-${section.key}`}>{section.heading}</Label>
            <Textarea
              id={`section-${section.key}`}
              rows={5}
              value={texts[section.key] ?? ""}
              onChange={(e) => {
                setTexts((prev) => ({ ...prev, [section.key]: e.target.value }));
                setStatus("idle");
              }}
            />
          </div>
        )
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save report"}
        </Button>
        {status === "saved" && <span className="text-sm text-success">Saved.</span>}
      </div>
    </div>
  );
}
