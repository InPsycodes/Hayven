import { describe, expect, it } from "vitest";

import { extractBiggestWin, generateParentReport, parentGoalLabel, renderReportBody } from "./generate";
import type { GenerationInput } from "./types";

describe("parentGoalLabel", () => {
  it("drops a growth verb so the bar names what is growing", () => {
    expect(parentGoalLabel("Increase verbal requesting")).toBe("Verbal requesting");
    expect(parentGoalLabel("Improve turn-taking")).toBe("Turn-taking");
  });

  it("keeps reduce/decrease goals and noun-led titles whole", () => {
    expect(parentGoalLabel("Reduce elopement")).toBe("Reduce elopement");
    expect(parentGoalLabel("Requesting with words")).toBe("Requesting with words");
    expect(parentGoalLabel("Increase of vocabulary")).toBe("Increase of vocabulary");
  });
});

describe("extractBiggestWin", () => {
  it("lifts the answer out of the stitched notes", () => {
    expect(extractBiggestWin("Arrived: calm. Biggest win: Asked for the swing. Home practice focus: name snacks.")).toBe(
      "Asked for the swing."
    );
  });

  it("is null when there is no win", () => {
    expect(extractBiggestWin("Arrived: calm.")).toBeNull();
    expect(extractBiggestWin(null)).toBeNull();
  });
});

function input(notes: string): GenerationInput {
  return {
    session: {
      date: "2026-10-10",
      durationMinutes: 40,
      setting: "in_person",
      therapistNotes: notes,
      homePractice: null,
      attendance: "present",
      generalPresentation: null,
      therapistName: "Ife Daniels",
      location: "Lagos",
    },
    goals: [{ id: "g1", title: "Increase verbal requesting", domain: "communication", percentComplete: 55, previousPercentComplete: null, note: null }],
    behaviours: [],
    skills: [],
    reinforcers: [],
    abcObservations: [],
    history: { sessionDates: ["2026-10-10"], goals: [{ id: "g1", values: [55] }], skills: [], behaviours: [] },
  } as GenerationInput;
}

describe("parent report: today's wins", () => {
  const ctx = { tone: "warm" as const, extra: new Map() };

  it("leads with the therapist's own win and doesn't repeat it in the quote", () => {
    const body = renderReportBody(generateParentReport(input("Arrived: calm. Biggest win: Asked for the swing using two words."), ctx), "Amara");
    const wins = body.sections.find((s) => s.key === "todays_wins")!.blocks[0].items ?? [];
    expect(wins[0]).toBe("Asked for the swing using two words.");
    expect(wins.join(" ")).not.toContain("stayed engaged");
    const quote = body.sections.find((s) => s.key === "greeting")!.blocks.find((b) => b.type === "quote")?.text ?? "";
    expect(quote).not.toContain("swing");
  });

  it("labels the progress bar by what is growing", () => {
    const body = renderReportBody(generateParentReport(input("Arrived: calm."), ctx), "Amara");
    const bars = body.sections.find((s) => s.key === "progress_snapshot")!.blocks.find((b) => b.type === "progress_bars")?.bars ?? [];
    expect(bars[0].label).toBe("Verbal requesting");
  });

  it("falls back to the general line when there is nothing specific", () => {
    const body = renderReportBody(generateParentReport(input("Arrived: calm."), ctx), "Amara");
    const wins = body.sections.find((s) => s.key === "todays_wins")!.blocks[0].items ?? [];
    expect(wins[0]).toContain("Amara");
  });
});
