import { describe, expect, it } from "vitest";

import { lowerFirst, parentPhrase, readableNotes } from "./generate";

describe("parentPhrase", () => {
  it("turns an instruction-style goal title into an -ing phrase", () => {
    expect(parentPhrase("Increase verbal requesting")).toBe("increasing verbal requesting");
    expect(parentPhrase("Reduce elopement during transitions")).toBe("reducing elopement during transitions");
    expect(parentPhrase("To follow two-step instructions")).toBe("following two-step instructions");
  });

  it("keeps acronyms and leaves noun-led titles alone", () => {
    expect(parentPhrase("Use AAC to request snacks")).toBe("using AAC to request snacks");
    expect(parentPhrase("Use of AAC")).toBe("use of AAC");
    expect(parentPhrase("AAC use at home")).toBe("AAC use at home");
    expect(parentPhrase("Name recognition")).toBe("name recognition");
    expect(parentPhrase("Transition tolerance")).toBe("transition tolerance");
    expect(parentPhrase("Two-word phrase requesting")).toBe("two-word phrase requesting");
  });
});

describe("lowerFirst", () => {
  it("lowercases ordinary words but not acronyms", () => {
    expect(lowerFirst("Elopement")).toBe("elopement");
    expect(lowerFirst("PECS exchange")).toBe("PECS exchange");
  });
});

describe("readableNotes", () => {
  it("drops a label the answer already repeats", () => {
    expect(readableNotes("Arrived: Arrived happy and settled quickly.")).toBe("Arrived happy and settled quickly.");
  });

  it("turns the form labels into prose and keeps the answer's capitals", () => {
    expect(readableNotes("Arrived: Ada was tired. Biggest win: Ada asked for help.")).toBe(
      "On arrival: Ada was tired. The biggest win today: Ada asked for help."
    );
  });

  it("leaves notes without labels unchanged", () => {
    expect(readableNotes("Good focus throughout.")).toBe("Good focus throughout.");
  });
});
