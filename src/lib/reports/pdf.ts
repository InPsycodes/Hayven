import "server-only";

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

import type { ReportBlock, ReportBody, ReportTrendLine } from "./types";

export type ReportPdfVersion = "clinical" | "parent";

export interface ReportPdfInput {
  body: ReportBody;
  version: ReportPdfVersion;
  childName: string;
  /** ISO date (YYYY-MM-DD) of the session the report covers. */
  sessionDate: string | null;
  therapistName: string | null;
  /** Who is downloading it, printed in the footer so a copy can always be traced back. */
  downloadedBy: string;
  /** Parent version only: the parent the report is prepared for. */
  preparedFor?: string | null;
}

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");
const fontCache = new Map<string, Buffer>();
function font(file: string): Buffer {
  let buf = fontCache.get(file);
  if (!buf) {
    buf = fs.readFileSync(path.join(FONT_DIR, file));
    fontCache.set(file, buf);
  }
  return buf;
}

const F = { regular: "Inter", semi: "InterSemi", italic: "InterItalic", serif: "Fraunces" } as const;

const C = {
  ink: "#221c15",
  soft: "#5e554a",
  muted: "#8a8073",
  line: "#ddd4c4",
  accent: "#a4562c",
  good: "#3f6b45",
  bad: "#8f2e24",
  track: "#e6dfd2",
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 58;
const MARGIN_BOTTOM = 84;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const PAGE_LIMIT = PAGE_H - MARGIN_BOTTOM;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function longDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function shortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_X, right: MARGIN_X },
    bufferPages: true,
    info: {
      Title: input.version === "clinical" ? "Hayven clinical session report" : "Hayven progress report",
      Author: "Hayven Health Limited",
      Creator: "Hayven",
    },
  });
  doc.registerFont(F.regular, font("inter-400.woff"));
  doc.registerFont(F.semi, font("inter-600.woff"));
  doc.registerFont(F.italic, font("inter-400-italic.woff"));
  doc.registerFont(F.serif, font("fraunces-600.woff"));

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const clinical = input.version === "clinical";

  function ensure(height: number) {
    if (doc.y + height > PAGE_LIMIT) doc.addPage();
  }

  function triangle(cx: number, cy: number, up: boolean, color: string) {
    const s = 3;
    doc.save().fillColor(color);
    if (up) doc.polygon([cx - s, cy + s * 0.8], [cx + s, cy + s * 0.8], [cx, cy - s]);
    else doc.polygon([cx - s, cy - s * 0.8], [cx + s, cy - s * 0.8], [cx, cy + s]);
    doc.fill().restore();
  }

  // ---- header (first page)
  doc.font(F.serif).fontSize(15).fillColor(C.accent).text("Hayven", MARGIN_X, MARGIN_TOP - 4, { lineBreak: false });
  if (clinical) {
    doc
      .font(F.semi)
      .fontSize(7)
      .fillColor(C.bad)
      .text("CONFIDENTIAL", MARGIN_X, MARGIN_TOP, { width: CONTENT_W, align: "right", characterSpacing: 1.2, lineBreak: false });
  }
  doc.y = MARGIN_TOP + 26;
  doc.x = MARGIN_X;
  doc
    .font(F.serif)
    .fontSize(22)
    .fillColor(C.ink)
    .text(clinical ? "Clinical session report" : "Progress report", { width: CONTENT_W });
  const metaParts = [input.childName, longDate(input.sessionDate), input.therapistName ? `with ${input.therapistName}` : null].filter(
    Boolean
  ) as string[];
  doc.moveDown(0.25).font(F.regular).fontSize(10).fillColor(C.soft).text(metaParts.join("  ·  "), { width: CONTENT_W });
  doc.moveDown(0.6);
  doc.moveTo(MARGIN_X, doc.y).lineTo(MARGIN_X + CONTENT_W, doc.y).lineWidth(0.75).strokeColor(C.line).stroke();
  doc.y += 14;
  doc.x = MARGIN_X;

  // ---- blocks
  function eyebrow(label: string) {
    doc.font(F.semi).fontSize(7).fillColor(C.accent).text(label.toUpperCase(), MARGIN_X, doc.y, { width: CONTENT_W, characterSpacing: 1 });
    doc.y += 2;
  }

  function paragraph(block: ReportBlock) {
    const text = block.text ?? "";
    doc.font(F.regular).fontSize(9.5);
    ensure((block.label ? 14 : 0) + Math.min(doc.heightOfString(text, { width: CONTENT_W, lineGap: 2.5 }), 60));
    if (block.label) eyebrow(block.label);
    doc.font(F.regular).fontSize(9.5).fillColor(C.ink).text(text, MARGIN_X, doc.y, { width: CONTENT_W, lineGap: 2.5 });
    doc.y += 8;
  }

  function quote(block: ReportBlock) {
    const text = `“${block.text ?? ""}”`;
    doc.font(F.italic).fontSize(9.5);
    const h = doc.heightOfString(text, { width: CONTENT_W - 14, lineGap: 2.5 });
    ensure(h + (block.label ? 14 : 0));
    const top = doc.y;
    doc.fillColor(C.soft).text(text, MARGIN_X + 14, top, { width: CONTENT_W - 14, lineGap: 2.5 });
    const bottom = doc.y;
    doc.moveTo(MARGIN_X + 3, top + 1).lineTo(MARGIN_X + 3, bottom - 1).lineWidth(1.5).strokeColor(C.accent).stroke();
    if (block.label) {
      doc.font(F.semi).fontSize(6.5).fillColor(C.muted).text(block.label.toUpperCase(), MARGIN_X + 14, bottom + 2, { width: CONTENT_W - 14, characterSpacing: 0.8 });
    }
    doc.y += 8;
  }

  function bullets(block: ReportBlock) {
    for (const item of block.items ?? []) {
      doc.font(F.regular).fontSize(9.5);
      const h = doc.heightOfString(item, { width: CONTENT_W - 14, lineGap: 2.5 });
      ensure(Math.min(h, 40) + 3);
      const y = doc.y;
      doc.circle(MARGIN_X + 3, y + 5, 1.5).fillColor(C.accent).fill();
      doc.fillColor(C.ink).text(item, MARGIN_X + 14, y, { width: CONTENT_W - 14, lineGap: 2.5 });
      doc.y += 3;
    }
    doc.y += 5;
  }

  function dataTable(block: ReportBlock) {
    const columns = block.columns ?? [];
    const rows = block.rows ?? [];
    if (columns.length === 0 || rows.length === 0) return;
    const firstW = CONTENT_W * 0.42;
    const restW = (CONTENT_W - firstW) / Math.max(1, columns.length - 1);
    const colX = (i: number) => (i === 0 ? MARGIN_X : MARGIN_X + firstW + (i - 1) * restW);
    const colW = (i: number) => (i === 0 ? firstW : restW);

    function header() {
      const y = doc.y;
      doc.font(F.semi).fontSize(6.5).fillColor(C.muted);
      columns.forEach((c, i) => {
        doc.text(c.toUpperCase(), colX(i), y, { width: colW(i) - (i === 0 ? 0 : 2), align: i === 0 ? "left" : "right", characterSpacing: 0.6, lineBreak: false });
      });
      doc.y = y + 12;
      doc.moveTo(MARGIN_X, doc.y).lineTo(MARGIN_X + CONTENT_W, doc.y).lineWidth(0.6).strokeColor(C.line).stroke();
      doc.y += 4;
    }

    ensure(60);
    header();
    const groups = block.rowGroups ?? [];
    const trends = block.rowTrends ?? [];
    rows.forEach((row, r) => {
      if (groups[r] && groups[r] !== groups[r - 1]) {
        ensure(34);
        doc.font(F.semi).fontSize(6.5).fillColor(C.muted).text(groups[r].toUpperCase(), MARGIN_X, doc.y + 4, { width: CONTENT_W, characterSpacing: 0.8 });
        doc.y += 3;
      }
      doc.font(F.regular).fontSize(9);
      const heights = row.map((cell, i) => doc.heightOfString(cell, { width: colW(i) - 2 }));
      const rowH = Math.max(...heights, 11);
      ensure(rowH + 8);
      const y = doc.y;
      const trend = trends[r];
      row.forEach((cell, i) => {
        const isLast = i === row.length - 1;
        const color = isLast && trend === "positive" ? C.good : isLast && trend === "negative" ? C.bad : C.ink;
        doc.font(isLast && trend ? F.semi : F.regular).fontSize(9).fillColor(color);
        doc.text(cell, colX(i), y, { width: colW(i) - (i === 0 ? 0 : 2), align: i === 0 ? "left" : "right", lineBreak: i === 0 });
        if (isLast && trend) {
          const w = doc.widthOfString(cell);
          const cx = colX(i) + colW(i) - 2 - w - 8;
          if (trend === "neutral") doc.circle(cx, y + 5, 1.6).fillColor(C.muted).fill();
          else triangle(cx, y + 5, trend === "positive", color);
        }
      });
      doc.y = y + rowH + 4;
      doc.moveTo(MARGIN_X, doc.y - 1).lineTo(MARGIN_X + CONTENT_W, doc.y - 1).lineWidth(0.4).strokeColor(C.line).stroke();
      doc.y += 3;
    });
    doc.y += 6;
  }

  function progressBars(block: ReportBlock) {
    for (const bar of block.bars ?? []) {
      ensure(30);
      const y = doc.y;
      const delta = bar.previousValue === null ? null : Math.round(bar.value - bar.previousValue);
      doc.font(F.regular).fontSize(9.5).fillColor(C.ink).text(bar.label, MARGIN_X, y, { width: CONTENT_W - 90, lineBreak: false, ellipsis: true });
      const pct = `${Math.round(bar.value)}%`;
      doc.font(F.semi).fontSize(9.5).fillColor(C.ink);
      const pctW = doc.widthOfString(pct);
      const right = MARGIN_X + CONTENT_W;
      let cursor = right;
      if (delta !== null && delta !== 0) {
        const d = String(Math.abs(delta));
        doc.font(F.regular).fontSize(8.5);
        const dW = doc.widthOfString(d);
        doc.fillColor(delta > 0 ? C.good : C.muted).text(d, right - dW, y + 0.5, { lineBreak: false });
        triangle(right - dW - 7, y + 5.5, delta > 0, delta > 0 ? C.good : C.muted);
        cursor = right - dW - 14;
      }
      doc.font(F.semi).fontSize(9.5).fillColor(C.ink).text(pct, cursor - pctW, y, { lineBreak: false });
      const by = y + 15;
      doc.roundedRect(MARGIN_X, by, CONTENT_W, 5, 2.5).fillColor(C.track).fill();
      const w = (CONTENT_W * clamp(bar.value, 0, 100)) / 100;
      if (w > 0) doc.roundedRect(MARGIN_X, by, Math.max(w, 5), 5, 2.5).fillColor(C.accent).fill();
      if (bar.previousValue !== null) {
        const tx = MARGIN_X + (CONTENT_W * clamp(bar.previousValue, 0, 100)) / 100;
        doc.moveTo(tx, by - 1.5).lineTo(tx, by + 6.5).lineWidth(1).strokeColor(C.ink).strokeOpacity(0.4).stroke().strokeOpacity(1);
      }
      doc.y = by + 15;
    }
    doc.y += 4;
  }

  function sparkline(line: ReportTrendLine, x: number, y: number, w: number, h: number, color: string) {
    const known = line.points.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
    if (known.length < 2) return;
    const isPct = line.unit === "percent";
    const max = isPct ? 100 : Math.max(...known.map((p) => p.v)) * 1.15 || 1;
    const px = (i: number) => x + 2 + (i / Math.max(1, line.points.length - 1)) * (w - 4);
    const py = (v: number) => y + 2 + (1 - clamp(v / max, 0, 1)) * (h - 4);
    doc.save();
    doc.moveTo(px(known[0].i), y + h - 2);
    known.forEach((p) => doc.lineTo(px(p.i), py(p.v)));
    doc.lineTo(px(known[known.length - 1].i), y + h - 2).closePath().fillColor(color).fillOpacity(0.12).fill();
    doc.restore();
    doc.save();
    known.forEach((p, k) => (k === 0 ? doc.moveTo(px(p.i), py(p.v)) : doc.lineTo(px(p.i), py(p.v))));
    doc.lineWidth(1.6).lineJoin("round").lineCap("round").strokeColor(color).stroke();
    doc.restore();
  }

  function trendLines(block: ReportBlock) {
    const lines = (block.lines ?? []).filter((l) => l.points.filter((v) => v !== null).length >= 2);
    if (lines.length === 0) return;
    const dates = block.pointDates ?? [];
    ensure(70);
    if (block.label) eyebrow(block.label);
    for (const line of lines) {
      ensure(64);
      const known = line.points.filter((v): v is number => v !== null);
      const first = known[0];
      const last = known[known.length - 1];
      const isPct = line.unit === "percent";
      const flat = Math.abs(last - first) < (isPct ? 1 : 0.3);
      const improved = line.improvement === "up" ? last > first : last < first;
      const color = flat ? C.muted : improved ? C.good : C.accent;
      const shown = `${isPct ? Math.round(last) : Math.round(last * 10) / 10}${isPct ? "%" : "/hr"}`;
      const tail = flat ? "" : improved ? "  ·  improving" : "  ·  watching";
      const y = doc.y;
      doc.font(F.regular).fontSize(9.5).fillColor(C.ink).text(line.label, MARGIN_X, y, { width: CONTENT_W - 130, lineBreak: false, ellipsis: true });
      doc.font(F.regular).fontSize(9).fillColor(C.soft);
      const full = shown + tail;
      const fw = doc.widthOfString(full);
      doc.text(shown, MARGIN_X + CONTENT_W - fw, y, { lineBreak: false });
      if (tail) doc.fillColor(color).text(tail, MARGIN_X + CONTENT_W - doc.widthOfString(tail), y, { lineBreak: false });
      sparkline(line, MARGIN_X, y + 14, CONTENT_W, 26, color);
      if (dates.length >= 2) {
        doc.font(F.regular).fontSize(6.5).fillColor(C.muted);
        doc.text(shortDate(dates[0]), MARGIN_X, y + 42, { lineBreak: false });
        const endLabel = shortDate(dates[dates.length - 1]);
        doc.text(endLabel, MARGIN_X + CONTENT_W - doc.widthOfString(endLabel), y + 42, { lineBreak: false });
      }
      doc.y = y + 56;
    }
    doc.y += 2;
  }

  for (const section of input.body.sections) {
    ensure(70);
    doc.font(F.serif).fontSize(13).fillColor(C.ink).text(section.heading, MARGIN_X, doc.y, { width: CONTENT_W });
    doc.y += 6;
    for (const block of section.blocks) {
      if (block.type === "quote") quote(block);
      else if (block.type === "bullets") bullets(block);
      else if (block.type === "data_table") dataTable(block);
      else if (block.type === "progress_bars") progressBars(block);
      else if (block.type === "trend_lines") trendLines(block);
      else paragraph(block);
    }
    doc.y += 8;
  }

  // ---- footer + running header on every page
  const range = doc.bufferedPageRange();
  const stamp = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  const confidentiality = clinical
    ? "Confidential clinical record. Contains a child’s health information, for the treating care team only. Do not copy, forward or share it without the parent’s consent."
    : `${input.preparedFor ? `Prepared for ${input.preparedFor}. ` : ""}This contains your child’s health information. Please keep it private.`;
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0;
    doc.page.margins.top = 0;
    if (i > 0) {
      doc.font(F.regular).fontSize(7.5).fillColor(C.muted).text(
        `Hayven  ·  ${clinical ? "Clinical session report" : "Progress report"}  ·  ${input.childName}`,
        MARGIN_X,
        30,
        { width: CONTENT_W, lineBreak: false }
      );
    }
    const fy = PAGE_H - 70;
    doc.moveTo(MARGIN_X, fy).lineTo(MARGIN_X + CONTENT_W, fy).lineWidth(0.5).strokeColor(C.line).stroke();
    doc.font(F.regular).fontSize(7).fillColor(C.soft).text(confidentiality, MARGIN_X, fy + 6, { width: CONTENT_W - 60, lineGap: 1.5 });
    doc.font(F.regular).fontSize(7).fillColor(C.muted).text(
      `Hayven Health Limited (RC 9879135)  ·  hayven.com.ng  ·  Downloaded by ${input.downloadedBy} on ${stamp}`,
      MARGIN_X,
      fy + 30,
      { width: CONTENT_W - 60, lineBreak: false, ellipsis: true }
    );
    doc.font(F.semi).fontSize(7.5).fillColor(C.soft).text(`${i + 1} / ${range.count}`, MARGIN_X, fy + 6, {
      width: CONTENT_W,
      align: "right",
      lineBreak: false,
    });
  }

  doc.end();
  return done;
}
