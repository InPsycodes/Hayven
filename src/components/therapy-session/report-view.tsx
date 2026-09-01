import { Fragment } from "react";

import { Reveal } from "@/components/marketing/reveal";
import { formatShortDate } from "@/data/format";
import type { ReportBlock, ReportBody, ReportSection } from "@/lib/reports/types";

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

const TREND_STYLE: Record<"positive" | "negative" | "neutral", { symbol: string; className: string }> = {
  positive: { symbol: "▲", className: "text-success-text" },
  negative: { symbol: "▼", className: "text-error-text" },
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

function ProgressBars({ bars }: { bars: NonNullable<ReportBlock["bars"]> }) {
  return (
    <div className="flex flex-col gap-3.5">
      {bars.map((bar, i) => {
        const delta = bar.previousValue === null ? null : Math.round(bar.value - bar.previousValue);
        return (
          <div key={i}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-charcoal">{bar.label}</span>
              <span className="shrink-0 tabular-nums font-medium text-charcoal">
                {Math.round(bar.value)}%
                {delta !== null && delta !== 0 && (
                  <span className={delta > 0 ? "text-success-text" : "text-muted-foreground"}>
                    {" "}
                    {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                  </span>
                )}
              </span>
            </div>
            <div className="relative mt-1.5 h-2 rounded-full bg-border">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-terracotta"
                style={{ width: `${clampPct(bar.value)}%` }}
              />
              {bar.previousValue !== null && (
                <span
                  className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded bg-charcoal/40"
                  style={{ left: `${clampPct(bar.previousValue)}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ line }: { line: NonNullable<ReportBlock["lines"]>[number] }) {
  const W = 320;
  const H = 44;
  const pad = 4;
  const known = line.points
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);
  if (known.length < 2) return null;

  const isPct = line.unit === "percent";
  const max = isPct ? 100 : Math.max(...known.map((p) => p.v)) * 1.15 || 1;
  const x = (i: number) => pad + (i / Math.max(1, line.points.length - 1)) * (W - 2 * pad);
  const y = (v: number) => pad + (1 - v / max) * (H - 2 * pad);
  const path = known.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${path} L${x(known[known.length - 1].i).toFixed(1)},${H - pad} L${x(known[0].i).toFixed(1)},${H - pad} Z`;

  const first = known[0].v;
  const last = known[known.length - 1].v;
  const flat = Math.abs(last - first) < (isPct ? 1 : 0.3);
  const improved = line.improvement === "up" ? last > first : last < first;
  const tone = flat ? "text-muted-foreground" : improved ? "text-success-text" : "text-terracotta";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`h-11 w-full ${tone}`} aria-hidden="true">
      <path d={area} fill="currentColor" fillOpacity={0.12} />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function TrendLines({ block }: { block: ReportBlock }) {
  const lines = (block.lines ?? []).filter((l) => l.points.filter((v) => v !== null).length >= 2);
  if (lines.length === 0) return null;
  const dates = block.pointDates ?? [];

  return (
    <div className="flex flex-col gap-4">
      {block.label && <Eyebrow>{block.label}</Eyebrow>}
      {lines.map((line, i) => {
        const known = line.points.filter((v): v is number => v !== null);
        const first = known[0];
        const last = known[known.length - 1];
        const unit = line.unit === "percent" ? "%" : "/hr";
        const flat = Math.abs(last - first) < (line.unit === "percent" ? 1 : 0.3);
        const improved = line.improvement === "up" ? last > first : last < first;
        const shown = line.unit === "percent" ? Math.round(last) : Math.round(last * 10) / 10;
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-charcoal">{line.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {shown}
                {unit}
                {!flat && (
                  <span className={improved ? "text-success-text" : "text-terracotta"}>
                    {" "}
                    · {improved ? "improving" : "watching"}
                  </span>
                )}
              </span>
            </div>
            <Sparkline line={line} />
            {dates.length >= 2 && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatShortDate(dates[0])}</span>
                <span>{formatShortDate(dates[dates.length - 1])}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Block({ block }: { block: ReportBlock }) {
  if (block.type === "progress_bars") {
    return block.bars && block.bars.length > 0 ? <ProgressBars bars={block.bars} /> : null;
  }
  if (block.type === "trend_lines") {
    return <TrendLines block={block} />;
  }
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
    <div className="flex flex-col gap-3 rounded-sm bg-card p-5 ring-1 ring-border">
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
      {body.sections.map((section, i) => (
        <Reveal key={`${section.key}-${i}`} delayMs={i * 100}>
          <SectionCard section={section} />
        </Reveal>
      ))}
    </div>
  );
}
