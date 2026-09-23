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

  it("splits a blank-line-separated body into separate paragraphs", () => {
    const html = renderNotificationEmail("Title", "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.");
    const paragraphCount = (html.match(/font-size:15px/g) ?? []).length; // body paragraphs only, not the 12px footer
    expect(paragraphCount).toBe(3);
    expect(html).toContain("First paragraph.");
    expect(html).toContain("Second paragraph.");
    expect(html).toContain("Third paragraph.");
  });

  it("renders a single-paragraph body exactly as before (no regression)", () => {
    const html = renderNotificationEmail("Title", "Just one line, no blank lines at all.");
    const paragraphCount = (html.match(/font-size:15px/g) ?? []).length;
    expect(paragraphCount).toBe(1);
  });

  it("escapes HTML within each paragraph independently", () => {
    const html = renderNotificationEmail("Title", "<b>bold</b> first.\n\n<i>italic</i> second.");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain("&lt;i&gt;italic&lt;/i&gt;");
  });

  it("converts a single newline within a paragraph to a <br />, not a space", () => {
    const html = renderNotificationEmail("Title", "Warmly,\nAdemola\nFounder, Hayven");
    expect(html).toContain("Warmly,<br />Ademola<br />Founder, Hayven");
  });

  it("escapes HTML before converting newlines to <br />, so a line break can't smuggle raw HTML", () => {
    const html = renderNotificationEmail("Title", "<script>1</script>\nline two");
    expect(html).not.toContain("<script>1</script>");
    expect(html).toContain("&lt;script&gt;1&lt;/script&gt;<br />line two");
  });
});
