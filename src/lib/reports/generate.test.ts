import { describe, expect, it } from "vitest";

import { generateParentReport, generateTherapistReport, renderReportBody } from "./generate";
import type { GenerationInput, ReportBody } from "./types";
import type { ToneContext } from "./generate";

const CTX: ToneContext = { tone: "warm", extra: new Map() };

function baseInput(overrides: Partial<GenerationInput> = {}): GenerationInput {
  return {
    session: {
      date: "2026-08-28",
      durationMinutes: 50,
      setting: "in_person",
      therapistNotes: "Arrived: calm. Biggest win: sat for circle time. Home practice focus: name snacks at mealtimes.",
      homePractice: "name snacks at mealtimes",
      attendance: "present",
      generalPresentation: "Regulated and engaged",
      therapistName: "Ife Daniels",
      location: "Lagos",
    },
    goals: [
      { id: "g1", title: "requesting with words", domain: "communication", percentComplete: 68, previousPercentComplete: 52, note: null },
    ],
    behaviours: [],
    skills: [],
    reinforcers: [],
    abcObservations: [],
    history: {
      sessionDates: ["2026-07-10", "2026-07-24", "2026-08-07", "2026-08-28"],
      goals: [{ id: "g1", values: [40, 47, 52, 68] }],
      skills: [],
      behaviours: [],
    },
    ...overrides,
  };
}

function sectionText(body: ReportBody, key: string): string {
  const section = body.sections.find((s) => s.key === key);
  if (!section) return "";
  return section.blocks
    .flatMap((b) => [b.text ?? "", ...(b.items ?? [])])
    .join(" ");
}

describe("generateParentReport", () => {
  it("leads 'How you can help at home' with the therapist's own home-practice text", () => {
    const body = renderReportBody(generateParentReport(baseInput(), CTX), "Amara");
    const nextSteps = body.sections.find((s) => s.key === "next_steps");
    expect(nextSteps).toBeDefined();
    const firstBullet = nextSteps!.blocks.find((b) => b.type === "bullets")?.items?.[0] ?? "";
    expect(firstBullet.toLowerCase()).toContain("name snacks at mealtimes");
  });

  it("does not repeat the home-practice line inside the session-narrative quote", () => {
    const body = renderReportBody(generateParentReport(baseInput(), CTX), "Amara");
    const greeting = body.sections.find((s) => s.key === "greeting");
    const quote = greeting!.blocks.find((b) => b.type === "quote")?.text ?? "";
    expect(quote).not.toContain("Home practice focus");
    expect(quote.toLowerCase()).not.toContain("name snacks at mealtimes");
  });

  it("varies the fallback next-steps wording by session date when there's no home practice", () => {
    const a = renderReportBody(
      generateParentReport(baseInput({ session: { ...baseInput().session, homePractice: null, therapistNotes: "Arrived: calm." }, goals: [{ id: "g1", title: "requesting with words", domain: "communication", percentComplete: 30, previousPercentComplete: null, note: null }] }), CTX),
      "Amara"
    );
    const b = renderReportBody(
      generateParentReport(baseInput({ session: { ...baseInput().session, date: "2026-09-04", homePractice: null, therapistNotes: "Arrived: calm." }, goals: [{ id: "g1", title: "requesting with words", domain: "communication", percentComplete: 30, previousPercentComplete: null, note: null }] }), CTX),
      "Amara"
    );
    expect(sectionText(a, "next_steps")).not.toEqual(sectionText(b, "next_steps"));
  });

  it("includes a progress snapshot with a bar per goal that has a percentage", () => {
    const body = renderReportBody(generateParentReport(baseInput(), CTX), "Amara");
    const snapshot = body.sections.find((s) => s.key === "progress_snapshot");
    expect(snapshot).toBeDefined();
    const bars = snapshot!.blocks.find((b) => b.type === "progress_bars")?.bars ?? [];
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({ label: "requesting with words", value: 68, previousValue: 52 });
  });

  it("draws a trend line once a goal has 3+ recorded points", () => {
    const body = renderReportBody(generateParentReport(baseInput(), CTX), "Amara");
    const snapshot = body.sections.find((s) => s.key === "progress_snapshot");
    const lines = snapshot!.blocks.find((b) => b.type === "trend_lines")?.lines ?? [];
    expect(lines).toHaveLength(1);
    expect(lines[0].points).toEqual([40, 47, 52, 68]);
  });

  it("omits the progress snapshot entirely when nothing was recorded", () => {
    const body = generateParentReport(
      baseInput({ goals: [], skills: [], behaviours: [], history: { sessionDates: [], goals: [], skills: [], behaviours: [] } }),
      CTX
    );
    expect(body.sections.find((s) => s.key === "progress_snapshot")).toBeUndefined();
  });

  it("substitutes the child's name at render time", () => {
    const body = renderReportBody(generateParentReport(baseInput(), CTX), "Amara");
    const allText = body.sections.flatMap((s) => s.blocks.flatMap((b) => [b.text ?? "", ...(b.items ?? [])])).join(" ");
    expect(allText).toContain("Amara");
    expect(allText).not.toContain("{{CHILD}}");
  });
});

describe("generateTherapistReport", () => {
  it("keeps the full session note (home-practice line included) in the clinical summary", () => {
    const body = renderReportBody(generateTherapistReport(baseInput()), "Amara");
    const summary = body.sections.find((s) => s.key === "session_summary");
    const quote = summary!.blocks.find((b) => b.type === "quote")?.text ?? "";
    expect(quote).toContain("Home practice focus");
  });

  it("adds trend lines under the data summary when history supports it", () => {
    const body = generateTherapistReport(baseInput());
    const dataSummary = body.sections.find((s) => s.key === "data_summary");
    const trend = dataSummary!.blocks.find((b) => b.type === "trend_lines");
    expect(trend).toBeDefined();
    expect(trend!.lines?.[0].points).toEqual([40, 47, 52, 68]);
  });
});
