import { describe, expect, it } from "vitest";

import { detectFlaggedPhrases, detectSafeguardingPhrases } from "./safety";

describe("detectSafeguardingPhrases", () => {
  it("matches safety wording case-insensitively", () => {
    expect(detectSafeguardingPhrases("Mum mentioned a BRUISE on his arm")).toEqual(["bruise"]);
    expect(detectSafeguardingPhrases("talked about self-harm")).toEqual(["self-harm"]);
  });

  it("does not page the DSL for clinical-only flags", () => {
    const text = "Suspected seizure during circle time; lack of sleep reported.";
    expect(detectFlaggedPhrases(text).length).toBeGreaterThan(0);
    expect(detectSafeguardingPhrases(text)).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(detectSafeguardingPhrases(null)).toEqual([]);
    expect(detectSafeguardingPhrases("")).toEqual([]);
  });
});
