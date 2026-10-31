import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

import { readState, type SeedState } from "./seed";
import { gotoSettled, signIn } from "./sign-in";

// Automated accessibility check (axe-core, WCAG 2.1 A and AA rules) of the
// main page of each area. Automated rules catch roughly a third of real
// barriers -- missing labels, contrast, landmarks, ARIA misuse -- so a pass
// here is a floor, not a substitute for a keyboard and screen-reader pass.
//
// Only "serious" and "critical" violations fail the test; the rest are
// printed so they stay visible without blocking.

let s: SeedState;
test.beforeAll(() => {
  s = readState();
});

async function audit(page: Page, label: string) {
  // Let entrance animations finish: axe reads mid-fade opacity as low contrast.
  await page.waitForTimeout(800);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    count: v.nodes.length,
    nodes: v.nodes.map((n) => `${n.target.join(" ")} -- ${n.any[0]?.message ?? n.failureSummary ?? ""} -- ${n.html.slice(0, 160)}`),
  }));
  if (summary.length) console.log(`a11y ${label}:`, JSON.stringify(summary, null, 1));
  const blocking = summary.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking, `serious/critical accessibility violations on ${label}`).toEqual([]);
}

test.describe("accessibility: public pages @mobile", () => {
  for (const path of ["/", "/who-we-serve", "/who-we-serve/teenagers", "/search", "/learn", "/about", "/login", "/signup"]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await audit(page, path);
    });
  }
});

test.describe("accessibility: signed-in areas", () => {
  test("parent", async ({ page }) => {
    await signIn(page, s.parentA.email, "/parent");
    for (const path of ["/parent", "/parent/children", `/parent/children/${s.parentA.childId}/intake`, "/parent/profile"]) {
      await page.goto(path);
      await audit(page, path);
    }
  });

  test("booking", async ({ page }) => {
    await signIn(page, s.parentA.email, "/parent");
    for (const path of [`/therapists/${s.therapistA.profileId}`, `/book/${s.therapistA.profileId}/time?type=virtual`]) {
      await page.goto(path);
      await audit(page, path);
    }
  });

  test("therapist", async ({ page }) => {
    await signIn(page, s.therapistA.email, "/therapist");
    for (const path of ["/therapist", "/therapist/caseload", `/therapist/children/${s.parentA.childId}`, "/therapist/learn"]) {
      await page.goto(path);
      await audit(page, path);
    }
  });

  test("supervisor", async ({ page }) => {
    await signIn(page, s.supervisor.email, "/therapist");
    for (const path of ["/supervisor", `/supervisor/therapists/${s.therapistA.profileId}`]) {
      await page.goto(path);
      await audit(page, path);
    }
  });

  test("admin", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, s.admin.email, "/admin");
    for (const path of ["/admin/overview", "/admin/accounts", "/admin/verification"]) {
      await gotoSettled(page, path);
      await audit(page, path);
    }
  });
});
