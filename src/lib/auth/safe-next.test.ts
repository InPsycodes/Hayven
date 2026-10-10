import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next";

const bs = String.fromCharCode(92);

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/parent")).toBe("/parent");
    expect(safeNextPath("/book/abc/time?type=virtual")).toBe("/book/abc/time?type=virtual");
  });

  it("rejects anything that leaves the site", () => {
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/" + bs + "evil.com")).toBeNull();
    expect(safeNextPath("/" + bs + bs + "evil.com")).toBeNull();
    expect(safeNextPath("/\t/evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("evil.com")).toBeNull();
  });

  it("is null when there is nothing to check", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
});
