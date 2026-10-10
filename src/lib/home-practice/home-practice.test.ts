import { describe, expect, it } from "vitest";

import { practiceWeek } from "./queries";
import { homePracticeLines, homePracticeLinesError } from "./sessions";
import type { HomePracticeActivity } from "./types";

const activity = (setOn: string): HomePracticeActivity => ({
  id: setOn,
  body: "Practice",
  setOn,
  therapistId: "t1",
  therapistName: "Ife Daniels",
  nextStep: null,
  tries: [],
});

describe("practiceWeek", () => {
  it("runs from the day after the session", () => {
    expect(practiceWeek([activity("2026-10-09")], "2026-10-13")).toEqual([
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
    ]);
  });

  it("starts today when the session was today", () => {
    expect(practiceWeek([activity("2026-10-13")], "2026-10-13")[0]).toBe("2026-10-13");
  });

  it("never starts more than six days ago, so today is always in view", () => {
    const week = practiceWeek([activity("2026-09-20")], "2026-10-13");
    expect(week[0]).toBe("2026-10-07");
    expect(week[6]).toBe("2026-10-13");
  });

  it("follows the latest session when several set practice", () => {
    expect(practiceWeek([activity("2026-10-02"), activity("2026-10-09")], "2026-10-13")[0]).toBe("2026-10-10");
  });
});

describe("homePracticeLines", () => {
  it("keeps the non-empty lines, trimmed, at most three", () => {
    expect(homePracticeLines(["  Snack time pause ", "", null, "Bath time names", "Fourth", "Fifth"])).toEqual([
      "Snack time pause",
      "Bath time names",
      "Fourth",
    ]);
  });

  it("flags a line that is too long", () => {
    expect(homePracticeLinesError(["a".repeat(501)])).not.toBeNull();
    expect(homePracticeLinesError(["Fine"])).toBeNull();
  });
});
