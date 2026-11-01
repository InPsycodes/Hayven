import { test, expect, type Page } from "@playwright/test";

import { readState, E2E_PASSWORD, type SeedState } from "./seed";
import { signIn } from "./sign-in";

// Keyboard-only use of the main journeys: what someone who can't use a
// mouse (or a screen-reader user, who navigates the same way) meets.
// axe (e2e/a11y.spec.ts) checks markup; this checks behaviour -- that Tab
// actually reaches things, shows where it is, and never gets stuck.

let s: SeedState;
test.beforeAll(() => {
  s = readState();
});

interface Stop {
  desc: string;
  named: boolean;
  visible: boolean;
  indicator: boolean;
}

/** Presses Tab `count` times and describes where focus lands each time. */
async function tabWalk(page: Page, count: number): Promise<Stop[]> {
  const stops: Stop[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return { desc: "body", named: true, visible: true, indicator: true };
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const label =
          el.getAttribute("aria-label") ||
          (el.getAttribute("aria-labelledby") &&
            document.getElementById(el.getAttribute("aria-labelledby")!)?.textContent) ||
          (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) ||
          el.closest("label")?.textContent ||
          el.getAttribute("title") ||
          el.getAttribute("placeholder") ||
          el.textContent ||
          el.querySelector("img[alt]")?.getAttribute("alt") ||
          "";
        return {
          desc: `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""} "${label.trim().replace(/\s+/g, " ").slice(0, 40)}"`,
          named: label.trim().length > 0,
          visible: r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && Number(cs.opacity) > 0,
          // Any of the ways this codebase draws focus: an outline or ring
          // (box-shadow) on the element, or a focus-within ring on a close
          // wrapper (search boxes draw it on the rounded container).
          indicator:
            el.matches(":focus-visible") === false ||
            [el, el.parentElement, el.parentElement?.parentElement].some((node) => {
              if (!node) return false;
              const st = getComputedStyle(node);
              return (st.outlineStyle !== "none" && parseFloat(st.outlineWidth) > 0) || st.boxShadow !== "none";
            }),
        };
      })
    );
  }
  return stops;
}

function expectHealthyWalk(stops: Stop[], label: string) {
  const real = stops.filter((st) => st.desc !== "body");
  expect(new Set(real.map((st) => st.desc)).size, `${label}: focus should move, not stay trapped`).toBeGreaterThan(3);
  expect(real.filter((st) => !st.visible).map((st) => st.desc), `${label}: focus on invisible elements`).toEqual([]);
  expect(real.filter((st) => !st.named).map((st) => st.desc), `${label}: focusable elements with no name`).toEqual([]);
  expect(real.filter((st) => !st.indicator).map((st) => st.desc), `${label}: focus with no visible indicator`).toEqual([]);
}

test.describe("keyboard: public pages @mobile", () => {
  test("the first Tab offers 'Skip to content', and it lands in the page's main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  for (const path of ["/", "/who-we-serve", "/search", "/learn"]) {
    test(`${path}: Tab moves through visible, named controls with a focus indicator`, async ({ page }) => {
      await page.goto(path);
      expectHealthyWalk(await tabWalk(page, 25), path);
    });
  }
});

test.describe("keyboard: forms", () => {
  test("log in with the keyboard only", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    expectHealthyWalk(await tabWalk(page, 8), "/login");
    await page.locator("#email").focus();
    await page.keyboard.type(s.parentB.email);
    // "Forgot password?" sits above the password box, so it comes first.
    for (let i = 0; i < 3 && !(await page.locator("#password").evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(page.locator("#password")).toBeFocused();
    await page.keyboard.type(E2E_PASSWORD);
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname.startsWith("/parent"), { timeout: 30_000 });
  });

  test("the sign-up form can be reached and filled from the keyboard", async ({ page }) => {
    await page.goto("/signup");
    const stops = await tabWalk(page, 15);
    expectHealthyWalk(stops, "/signup");
    expect(stops.some((st) => st.desc.startsWith("input")), "sign-up inputs reachable by Tab").toBe(true);
  });

  test("choosing a session time works with the keyboard", async ({ page }) => {
    await signIn(page, s.parentA.email, "/parent");
    await page.goto(`/book/${s.therapistA.profileId}/time?type=virtual`);
    const times = page.getByRole("radio");
    if ((await times.count()) === 0) test.skip(true, "no open times seeded for this therapist");
    await times.first().focus();
    await page.keyboard.press("Space");
    await expect(times.first()).toBeChecked();
    expectHealthyWalk(await tabWalk(page, 12), "booking time");
  });

  test("the intake form can be walked with Tab", async ({ page }) => {
    await signIn(page, s.parentA.email, "/parent");
    await page.goto(`/parent/children/${s.parentA.childId}/intake`);
    expectHealthyWalk(await tabWalk(page, 30), "intake");
  });
});

test.describe("keyboard: signed-in areas", () => {
  test("therapist workspace", async ({ page }) => {
    await signIn(page, s.therapistA.email, "/therapist");
    expectHealthyWalk(await tabWalk(page, 25), "/therapist");
  });

  test("Escape closes an open menu or dialog and returns focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /menu/i }).first();
    if ((await toggle.count()) === 0) test.skip(true, "no menu button at this width");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });
});
