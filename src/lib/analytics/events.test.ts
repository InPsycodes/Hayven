import { describe, it, expect } from "vitest";

import { sanitizeProps } from "./events";

// sanitizeProps is the single chokepoint every analytics event passes
// through (client and server, PostHog and GA). These tests pin the promise
// in events.ts: no child, family or clinical detail ever reaches analytics,
// whatever a call site hands it. Audit 2026-10-29.

describe("sanitizeProps", () => {
  it("keeps the allowlisted funnel properties", () => {
    expect(
      sanitizeProps({ role: "parent", count: 3, session_type: "virtual", amount_naira: 15000, sort: "recommended" })
    ).toEqual({ role: "parent", count: 3, session_type: "virtual", amount_naira: 15000, sort: "recommended" });
  });

  it("drops identifying and clinical fields a call site might pass by mistake", () => {
    const out = sanitizeProps({
      role: "parent",
      child_name: "Ada",
      first_name: "Ada",
      email: "parent@example.com",
      phone: "+2348000000000",
      date_of_birth: "2021-03-04",
      presenting_concern: "speech delay",
      notes: "Ada had a hard week",
      query: "Ada Okafor speech delay",
      child_id: "8f0b2c1e-0000-0000-0000-000000000000",
      report_text: "Session summary",
    });
    expect(out).toEqual({ role: "parent" });
  });

  it("drops objects, arrays and functions even under an allowed key", () => {
    expect(sanitizeProps({ role: { name: "Ada" } as unknown as string })).toEqual({});
    expect(sanitizeProps({ role: ["Ada"] as unknown as string })).toEqual({});
  });

  it("drops overlong strings, which could be free text pasted into a field", () => {
    expect(sanitizeProps({ sort: "x".repeat(500) })).toEqual({});
  });

  it("drops empty, null and non-finite values", () => {
    expect(sanitizeProps({ sort: "   ", role: null, count: Number.NaN, amount_naira: Infinity })).toEqual({});
  });

  it("handles no properties at all", () => {
    expect(sanitizeProps(undefined)).toEqual({});
    expect(sanitizeProps(null)).toEqual({});
  });
});
