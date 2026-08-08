import { Fragment } from "react";

import type { ReportBlock, ReportBody, ReportSection } from "@/lib/reports/types";

const TREND_STYLE: Record<"positive" | "negative" | "neutral", { symbol: string; className: string }> = {
  positive: { symbol: "▲", className: "text-success" },
  negative: { symbol: "▼", className: "text-error" },
  neutral: { symbol: "●", className: "text-muted-foreground" },
};

function Eyebrow({ children }: { children: string }) {
  return <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-terracotta">{children}</p>;
}

function DataTable({ block }: { block: ReportBlock }) {
  const rows = block.rows ?? [];
  const groups = block.rowGroups ?? [];
  const trends = block.rowTrends ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            {(block.columns ?? []).map((col, i) => (
              <th
                key={col}
                className={`border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${
                  i === 0 ? "text-left" : "text-right"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const showGroup = groups[i] && groups[i] !== groups[i - 1];
            const trend = trends[i];
            return (
              <Fragment key={i}>
                {showGroup && (
                  <tr>
                    <td colSpan={row.length} className="pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {groups[i]}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-border/60 last:border-b-0">
                  {row.map((cell, j) => {
                    const isLast = j === row.length - 1;
                    return (
                      <td key={j} className={`py-1.5 text-charcoal ${j === 0 ? "text-left" : "text-right tabular-nums"}`}>
                        {isLast && trend ? (
                          <span className={`inline-flex items-center gap-1.5 font-medium ${TREND_STYLE[trend].className}`}>
                            <span className="text-[10px]">{TREND_STYLE[trend].symbol}</span>
                            {cell}
                          </span>
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Block({ block }: { block: ReportBlock }) {
  if (block.type === "quote") {
    return (
      <blockquote className="border-l-2 border-terracotta pl-4">
        <p className="text-sm italic leading-relaxed text-muted-foreground">&ldquo;{block.text}&rdquo;</p>
        {block.label && <cite className="mt-1 block text-[10px] font-medium not-italic uppercase tracking-[0.1em] text-muted-foreground/80">{block.label}</cite>}
      </blockquote>
    );
  }
  if (block.type === "bullets") {
    return (
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-charcoal">
        {(block.items ?? []).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "data_table") {
    return <DataTable block={block} />;
  }
  return (
    <div>
      {block.label && <Eyebrow>{block.label}</Eyebrow>}
      <p className="text-sm leading-relaxed text-charcoal">{block.text}</p>
    </div>
  );
}

function SectionCard({ section }: { section: ReportSection }) {
  return (
    <div className="flex flex-col gap-3 rounded-sm bg-white p-5 ring-1 ring-border">
      <h2 className="font-serif text-lg font-semibold text-charcoal">{section.heading}</h2>
      <div className="flex flex-col gap-3">
        {section.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </div>
  );
}

export function ReportView({ body }: { body: ReportBody }) {
  return (
    <div className="flex flex-col gap-4">
      {body.sections.map((section) => (
        <SectionCard key={section.key} section={section} />
      ))}
    </div>
  );
}
