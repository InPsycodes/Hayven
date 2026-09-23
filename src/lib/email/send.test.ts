import { describe, expect, it } from "vitest";

import { renderNotificationEmail } from "./send";

describe("renderNotificationEmail", () => {
  it("renders without an action button when no actionUrl is given", () => {
    const html = renderNotificationEmail("Title", "Body text");
    expect(html).toContain("Title");
    expect(html).toContain("Body text");
    expect(html).not.toContain("<a href=");
  });

  it("renders a clickable action button when actionUrl is given", () => {
    const html = renderNotificationEmail("Title", "Body text", {
      actionUrl: "https://hayven.com.ng/admin/referrals",
      actionLabel: "Open in Hayven",
    });
    expect(html).toContain('href="https://hayven.com.ng/admin/referrals"');
    expect(html).toContain("Open in Hayven");
  });

  it("falls back to a default label when actionLabel is omitted", () => {
    const html = renderNotificationEmail("Title", "Body text", { actionUrl: "https://hayven.com.ng/parent" });
    expect(html).toContain("Open in Hayven");
  });

  it("escapes HTML in the action label the same way it does the title/body", () => {
    const html = renderNotificationEmail("Title", "Body", {
      actionUrl: "https://hayven.com.ng/x",
      actionLabel: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("still includes the unsubscribe link alongside an action button", () => {
    const html = renderNotificationEmail("Title", "Body", {
      actionUrl: "https://hayven.com.ng/x",
      unsubscribeUrl: "https://hayven.com.ng/unsubscribe?t=abc",
    });
    expect(html).toContain("https://hayven.com.ng/unsubscribe?t=abc");
    expect(html).toContain("https://hayven.com.ng/x");
  });
});
