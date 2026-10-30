import { describe, it, expect } from "vitest";

import { sanitizePath, sanitizeUrl, scrubCapture } from "./url-privacy";

const CHILD = "8f0b2c1e-1234-4abc-9def-0123456789ab";
const THREAD = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("sanitizePath", () => {
  it("replaces UUID segments with :id and leaves the rest", () => {
    expect(sanitizePath(`/parent/children/${CHILD}/intake`)).toBe("/parent/children/:id/intake");
    expect(sanitizePath(`/parent/messages/${THREAD}`)).toBe("/parent/messages/:id");
    expect(sanitizePath("/who-we-serve/teenagers")).toBe("/who-we-serve/teenagers");
  });
});

describe("sanitizeUrl", () => {
  it("drops the query string, fragment and ids", () => {
    expect(sanitizeUrl(`https://hayven.com.ng/parent/children/${CHILD}/intake?step=2#notes`)).toBe(
      "https://hayven.com.ng/parent/children/:id/intake"
    );
    expect(sanitizeUrl("https://hayven.com.ng/search?query=Ada%20Okafor%20speech%20delay")).toBe(
      "https://hayven.com.ng/search"
    );
  });

  it("resolves relative URLs against a base, and rejects garbage", () => {
    expect(sanitizeUrl("/search?query=Ada", "https://hayven.com.ng")).toBe("https://hayven.com.ng/search");
    expect(sanitizeUrl("not a url")).toBeNull();
  });
});

describe("scrubCapture", () => {
  it("cleans event URLs and the once-only person properties PostHog sets", () => {
    const capture = scrubCapture({
      properties: {
        $current_url: `https://hayven.com.ng/parent/children/${CHILD}/intake?x=1`,
        $pathname: `/parent/children/${CHILD}/intake`,
        $referrer: "https://www.google.com/search?q=Ada+Okafor+autism",
        $referring_domain: "www.google.com",
        role: "parent",
        $set_once: { $initial_current_url: "https://hayven.com.ng/search?query=Ada%20Okafor" },
      },
      $set_once: {
        $initial_current_url: "https://hayven.com.ng/search?query=Ada%20Okafor",
        $initial_referrer: "https://www.google.com/search?q=Ada",
        $initial_pathname: `/parent/messages/${THREAD}`,
      },
      $set: { $current_url: `https://hayven.com.ng/parent/messages/${THREAD}?reply=1` },
    });

    expect(capture.properties).toMatchObject({
      $current_url: "https://hayven.com.ng/parent/children/:id/intake",
      $pathname: "/parent/children/:id/intake",
      $referrer: "https://www.google.com/search",
      $referring_domain: "www.google.com",
      role: "parent",
      $set_once: { $initial_current_url: "https://hayven.com.ng/search" },
    });
    expect(capture.$set_once).toEqual({
      $initial_current_url: "https://hayven.com.ng/search",
      $initial_referrer: "https://www.google.com/search",
      $initial_pathname: "/parent/messages/:id",
    });
    expect(capture.$set).toEqual({ $current_url: "https://hayven.com.ng/parent/messages/:id" });
    expect(JSON.stringify(capture)).not.toMatch(/Ada|Okafor|8f0b2c1e|0a1b2c3d/);
  });

  it("leaves PostHog's $direct referrer marker and non-URL properties alone", () => {
    const capture = scrubCapture({ properties: { $referrer: "$direct", count: 3, role: "therapist" } });
    expect(capture.properties).toEqual({ $referrer: "$direct", count: 3, role: "therapist" });
  });
});
