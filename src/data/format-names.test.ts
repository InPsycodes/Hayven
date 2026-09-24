import { describe, it, expect } from "vitest";

import { greetingForNow, initialsFromName, shortName } from "./format";

describe("shortName", () => {
  it("uses the first name for a plain name", () => {
    expect(shortName("Ngozi Eze")).toBe("Ngozi");
    expect(shortName("Amara")).toBe("Amara");
  });

  it("never returns just a title", () => {
    expect(shortName("Dr. Adaeze Okafor")).toBe("Dr. Okafor");
    expect(shortName("Mrs Ngozi Eze")).toBe("Mrs Eze");
    expect(shortName("Pastor Yusuf Bello")).toBe("Pastor Bello");
    expect(shortName("Dr. Okafor")).toBe("Dr. Okafor");
  });

  it("handles blank and extra spaces", () => {
    expect(shortName("")).toBe("");
    expect(shortName("  Ọlá   Adéwálé ")).toBe("Ọlá");
  });
});

describe("initialsFromName", () => {
  it("skips a leading title", () => {
    expect(initialsFromName("Dr. Adaeze Okafor")).toBe("AO");
    expect(initialsFromName("Ngozi Eze")).toBe("NE");
  });

  it("keeps a lone word that looks like a title", () => {
    expect(initialsFromName("Chief")).toBe("C");
  });
});

describe("greetingForNow", () => {
  // Lagos is UTC+1 all year.
  it("follows the hour in Lagos", () => {
    expect(greetingForNow(new Date("2026-09-24T06:30:00Z"))).toBe("Good morning");
    expect(greetingForNow(new Date("2026-09-24T12:00:00Z"))).toBe("Good afternoon");
    expect(greetingForNow(new Date("2026-09-24T20:00:00Z"))).toBe("Good evening");
    expect(greetingForNow(new Date("2026-09-24T23:30:00Z"))).toBe("Good morning");
  });
});
