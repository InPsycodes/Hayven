import { describe, expect, it } from "vitest";

import { detectFlaggedPhrases, detectSafeguardingPhrases, reportBodyText } from "./safety";

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

describe("reportBodyText", () => {
  it("collects paragraph, quote and bullet text from every section", () => {
    const text = reportBodyText({
      sections: [
        { blocks: [{ text: "First paragraph." }, { text: "A quote." }] },
        { blocks: [{ items: ["One bullet", "Two bullets"] }, {}] },
      ],
    });
    expect(text).toBe("First paragraph.\nA quote.\nOne bullet\nTwo bullets");
  });

  it("is empty for a missing body", () => {
    expect(reportBodyText(null)).toBe("");
  });
});
