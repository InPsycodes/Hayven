import { describe, it, expect } from "vitest";

import { renderReportPdf } from "./pdf";
import type { ReportBody } from "./types";

const pageCount = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

const sample: ReportBody = {
  schemaVersion: 1,
  sections: [
    {
      key: "session_summary",
      heading: "Session summary",
      blocks: [
        { type: "paragraph", text: "Ọlá attended a 45-minute in-person session. Ẹbọ was calm; ṣe daadaa. Cost ₦15,000." },
        { type: "quote", text: "Arrived tired but settled quickly.", label: "Therapist's session note" },
      ],
    },
    {
      key: "data_summary",
      heading: "Data summary",
      blocks: [
        {
          type: "data_table",
          columns: ["Measure", "This session", "Previous session", "Change"],
          rows: [
            ["Increase verbal requesting", "55%", "30%", "up 25"],
            ["Elopement", "2.7/hr", "8/hr", "down 5.3"],
            ["Vocal protests", "9/hr", "6/hr", "up 3"],
            ["Sorting shapes", "60%", "60%", "no change"],
          ],
          rowGroups: ["Goals", "Behaviours (rate per hour)", "Behaviours (rate per hour)", "Skills"],
          rowTrends: ["positive", "positive", "negative", "neutral"],
        },
        {
          type: "trend_lines",
          label: "Across recent sessions",
          pointDates: ["2026-08-12", "2026-09-16"],
          lines: [
            { label: "Increase verbal requesting", points: [15, 25, 35, 45, 55, 65], unit: "percent", improvement: "up" },
            { label: "Elopement", points: [9, 8, null, 5, 3, 2], unit: "per_hour", improvement: "down" },
          ],
        },
      ],
    },
    {
      key: "progress_snapshot",
      heading: "Where things stand",
      blocks: [
        {
          type: "progress_bars",
          bars: [
            { label: "Increase verbal requesting", value: 55, previousValue: 30 },
            { label: "Matching colours", value: 80, previousValue: null },
          ],
        },
        { type: "bullets", items: ["Keep offering choices at mealtimes.", "Wait five seconds before helping."] },
      ],
    },
  ],
};

const base = {
  childName: "Ọlá",
  sessionDate: "2026-09-16",
  therapistName: "Dr. Adaeze Okafor",
  downloadedBy: "Dr. Adaeze Okafor",
};

describe("renderReportPdf", () => {
  it("renders a clinical report with every block type", async () => {
    const pdf = await renderReportPdf({ ...base, body: sample, version: "clinical" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5000);
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(1);
  });

  it("renders the parent version", async () => {
    const pdf = await renderReportPdf({ ...base, body: sample, version: "parent", preparedFor: "Ngozi Eze" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("flows long content onto more pages instead of overflowing", async () => {
    const long: ReportBody = {
      schemaVersion: 1,
      sections: Array.from({ length: 12 }, (_, i) => ({
        key: "session_summary" as const,
        heading: `Section ${i + 1}`,
        blocks: [{ type: "paragraph" as const, text: "A long observation about the session. ".repeat(60) }],
      })),
    };
    const pdf = await renderReportPdf({ ...base, body: long, version: "clinical" });
    expect(pageCount(pdf)).toBeGreaterThan(2);
  });

  it("copes with an empty report", async () => {
    const pdf = await renderReportPdf({ ...base, body: { schemaVersion: 1, sections: [] }, version: "parent" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
