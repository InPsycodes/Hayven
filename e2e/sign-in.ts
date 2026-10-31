import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

import { E2E_PASSWORD } from "./seed";

const AUTH_DIR = join(__dirname, ".auth");

/**
 * Signs in through the real login form once per person per run, then reuses
 * the saved session cookies. Signing in afresh for every test trips the
 * login rate limit (5 attempts per email per 15 minutes) -- which is the
 * limit working, not a test to fight.
 */
export async function signIn(page: Page, email: string, home: string) {
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

export async function gotoSettled(page: Page, path: string) {
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
