import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";

import { readState, E2E_PASSWORD, type SeedState } from "./seed";

const AUTH_DIR = join(__dirname, ".auth");

// Browser journeys for the four roles, run against a production build wired
// to the staging Supabase project with synthetic people (e2e/seed.ts).
// Checks real pages, real sign-in and the server-side guards a user meets by
// typing a URL -- not just what the menus show.

let s: SeedState;
test.beforeAll(() => {
  s = readState();
});

/**
 * Signs in through the real login form once per person per run, then reuses
 * the saved session cookies. Signing in afresh for every test trips the
 * login rate limit (5 attempts per email per 15 minutes) -- which is the
 * limit working, not a test to fight.
 */
async function signIn(page: Page, email: string, home: string) {
  mkdirSync(AUTH_DIR, { recursive: true });
  const stateFile = join(AUTH_DIR, `${email.replace(/[^a-z0-9]/gi, "_")}.json`);
  if (existsSync(stateFile)) {
    const { cookies } = JSON.parse(readFileSync(stateFile, "utf8"));
    await page.context().addCookies(cookies);
    await page.goto(home);
    // Wait for any redirect (e.g. /admin -> /admin/overview) to settle before
    // checking the session held, or the URL can still be empty mid-navigation.
    await page.waitForURL((url) => url.pathname.startsWith(home), { timeout: 30_000 });
    return;
  }
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith(home), { timeout: 30_000 });
  await page.context().storageState({ path: stateFile });
}

/** A page the signed-in user must not reach: a 404, or a bounce away from that path. */
async function expectBlocked(page: Page, path: string) {
  const response = await page.goto(path);
  const status = response?.status() ?? 0;
  const landedElsewhere = !new URL(page.url()).pathname.startsWith(path);
  const notFoundText = await page
    .getByText(/not found|could not be found|doesn.t exist/i)
    .first()
    .isVisible()
    .catch(() => false);
  expect(status === 404 || landedElsewhere || notFoundText, `${path} should be blocked (status ${status}, at ${page.url()})`).toBe(true);
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe("public site @mobile", () => {
  for (const path of ["/", "/who-we-serve", "/who-we-serve/teenagers", "/search", "/learn", "/about", "/login", "/signup"]) {
    test(`${path} loads without errors`, async ({ page }) => {
      const errors = collectErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(errors, `page errors on ${path}`).toEqual([]);
    });
  }

  test("signed-in areas send a logged-out visitor to login", async ({ page }) => {
    for (const path of ["/parent", "/therapist", "/admin/overview", "/supervisor"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

test.describe("parent journey", () => {
  test("signs in, sees their child, and opens the intake", async ({ page }) => {
    await signIn(page, s.parentA.email, "/parent");
    await expect(page.getByText(s.parentA.childName).first()).toBeVisible();
    await page.goto("/parent/children");
    await expect(page.getByText(s.parentA.childName).first()).toBeVisible();
    const intake = await page.goto(`/parent/children/${s.parentA.childId}/intake`);
    expect(intake?.status()).toBe(200);
  });

  test("cannot open another family's child or other roles' areas", async ({ page }) => {
    await signIn(page, s.parentA.email, "/parent");
    await expectBlocked(page, `/parent/children/${s.parentB.childId}/intake`);
    await expectBlocked(page, `/parent/children/${s.parentB.childId}/reports`);
    await expectBlocked(page, "/therapist");
    await expectBlocked(page, "/admin/overview");
    await expectBlocked(page, "/supervisor");
  });

  test("finds the therapist and books a slot up to the payment step", async ({ page }) => {
    await signIn(page, s.parentA.email, "/parent");
    await page.goto("/search");
    await expect(page.getByText("E2E Therapist A").first()).toBeVisible();
    await page.goto(`/therapists/${s.therapistA.profileId}`);
    await expect(page.getByText("E2E Therapist A").first()).toBeVisible();

    await page.goto(`/book/${s.therapistA.profileId}/time?type=virtual`);
    // Times are a radiogroup (role="radio"), not plain buttons.
    await page.getByRole("radio", { name: /\d{1,2}:\d{2}\s?(AM|PM)/i }).first().click();
    await page.getByRole("button", { name: /continue to payment/i }).click();
    await page.waitForURL(/\/payment/, { timeout: 30_000 });
    await expect(page.getByText(/order summary/i)).toBeVisible();
    await expect(page.getByText(/15,000/).first()).toBeVisible();
    // Stops before "Pay": that hands off to Flutterwave, which is covered by
    // the payment integration tests rather than driven from here.
  });

  // Parent B, so signing out doesn't revoke the session the other parent tests reuse.
  test("logging out ends access to the parent area", async ({ page }) => {
    await signIn(page, s.parentB.email, "/parent");
    await page.goto("/parent/profile");
    await page.getByRole("button", { name: /log out/i }).first().click();
    await page.waitForURL(/\/login|\/$/, { timeout: 30_000 });
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("parent journey on a phone @mobile", () => {
  test("signs in and sees their child", async ({ page }) => {
    await signIn(page, s.parentA.email, "/parent");
    await expect(page.getByText(s.parentA.childName).first()).toBeVisible();
  });
});

test.describe("therapist journey", () => {
  test("assigned therapist sees the child on their caseload and can open them", async ({ page }) => {
    await signIn(page, s.therapistA.email, "/therapist");
    await page.goto("/therapist/caseload");
    await expect(page.getByText(s.parentA.childName).first()).toBeVisible();
    const res = await page.goto(`/therapist/children/${s.parentA.childId}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText(s.parentA.childName).first()).toBeVisible();
  });

  test("cannot open a child they are not assigned to, or admin pages", async ({ page }) => {
    await signIn(page, s.therapistA.email, "/therapist");
    await expectBlocked(page, `/therapist/children/${s.parentB.childId}`);
    await expectBlocked(page, `/therapist/children/${s.parentB.childId}/intake`);
    await expectBlocked(page, "/admin/overview");
    await expectBlocked(page, "/parent");
  });

  test("an unassigned therapist cannot open the child at all", async ({ page }) => {
    await signIn(page, s.therapistB.email, "/therapist");
    await page.goto("/therapist/caseload");
    await expect(page.getByText(s.parentA.childName)).toHaveCount(0);
    await expectBlocked(page, `/therapist/children/${s.parentA.childId}`);
    await expectBlocked(page, `/therapist/children/${s.parentA.childId}/intake`);
  });
});

test.describe("supervisor journey", () => {
  test("sees the therapist they supervise", async ({ page }) => {
    await signIn(page, s.supervisor.email, "/therapist");
    await page.goto("/supervisor");
    await expect(page.getByText("E2E Therapist A").first()).toBeVisible();
    const res = await page.goto(`/supervisor/therapists/${s.therapistA.profileId}`);
    expect(res?.status()).toBe(200);
  });

  test("cannot open a therapist they do not supervise, or admin pages", async ({ page }) => {
    await signIn(page, s.supervisor.email, "/therapist");
    // This page renders for any supervised-therapist id and scopes its data
    // query to the viewing supervisor's team, so an unsupervised therapist's
    // page loads empty rather than 404ing. What matters: therapist B's child
    // must not appear.
    await page.goto(`/supervisor/therapists/${s.therapistB.profileId}`);
    await expect(page.getByText(/0 children/i).first()).toBeVisible();
    await expect(page.getByText("Bayo")).toHaveCount(0);
    await expectBlocked(page, `/supervisor/children/${s.parentB.childId}`);
    await expectBlocked(page, "/admin/overview");
  });

  test("an ordinary therapist cannot open the supervisor area", async ({ page }) => {
    await signIn(page, s.therapistB.email, "/therapist");
    await expectBlocked(page, "/supervisor");
  });
});

/**
 * Admin pages start a client-side navigation of their own shortly after load,
 * and a test goto() that lands mid-flight is aborted (net::ERR_ABORTED). A
 * person never moves that fast; settle the page first, and retry once if a
 * goto is still aborted.
 */
async function gotoSettled(page: Page, path: string) {
  // Admin pages keep polling (queue counts), so "networkidle" may never
  // come: cap the wait.
  const settle = () => page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await settle();
  try {
    return await page.goto(path);
  } catch (err) {
    if (!String(err).includes("ERR_ABORTED")) throw err;
    await settle();
    return page.goto(path);
  }
}

test.describe("admin journey", () => {
  test("signs in to the admin overview and opens the main queues", async ({ page }) => {
    test.setTimeout(120_000); // six pages, each a full server render
    await signIn(page, s.admin.email, "/admin");
    for (const path of ["/admin/overview", "/admin/accounts", "/admin/verification", "/admin/reports", "/admin/audit-log", "/admin/settings"]) {
      const res = await gotoSettled(page, path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });

  test("admin sign-in reaches the accounts list with the seeded parent", async ({ page }) => {
    await signIn(page, s.admin.email, "/admin");
    await gotoSettled(page, `/admin/accounts?q=${encodeURIComponent(s.parentA.email)}`);
    await expect(page.getByText(s.parentA.email).first()).toBeVisible();
  });
});
