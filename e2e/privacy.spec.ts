import { mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { test, expect, type Page, type Request } from "@playwright/test";

import { readState, E2E_PASSWORD, type SeedState } from "./seed";

// What actually leaves the browser for analytics. Run with E2E_ANALYTICS=1
// (npm run test:privacy), which builds with a dummy PostHog key so posthog-js
// produces its real requests. Every request to /ingest is answered locally
// and recorded -- none reach PostHog -- and every request to any other
// origin is recorded too. The payloads are then searched for the child's
// name, the parent's email, a typed search term, ids and intake content.

test.skip(!process.env.E2E_ANALYTICS, "privacy run only: E2E_ANALYTICS=1");

// The PWA service worker forwards /ingest itself (default NetworkFirst), and
// requests a service worker makes bypass page.route -- so with it running,
// event batches slip past the capture below. Block it for this check.
test.use({
  serviceWorkers: "block",
  // posthog-js also treats a "HeadlessChrome" user agent as a bot and drops
  // every event; present as ordinary desktop Chrome for this check.
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
});

let s: SeedState;
test.beforeAll(() => {
  s = readState();
});

interface Captured {
  url: string;
  body: string;
}

function decodeBody(request: Request): string {
  const buf = request.postDataBuffer();
  if (!buf) return "";
  try {
    return gunzipSync(buf).toString("utf8");
  } catch {
    const text = buf.toString("utf8");
    // posthog-js may send base64 in a "data=" form field.
    const m = text.match(/(?:^|&)data=([^&]+)/);
    if (m) {
      try {
        return Buffer.from(decodeURIComponent(m[1]), "base64").toString("utf8");
      } catch {
        return text;
      }
    }
    return text;
  }
}

async function captureAnalytics(page: Page): Promise<{ analytics: Captured[]; thirdParty: string[] }> {
  const analytics: Captured[] = [];
  const thirdParty: string[] = [];
  await page.route("**/ingest/**", async (route) => {
    const url = route.request().url();
    analytics.push({ url, body: decodeBody(route.request()) });
    // Answer like PostHog would, so posthog-js finishes starting up and goes
    // on to send its event batches (a wrong-shaped config reply stalls it).
    // The remote-config script must register itself, as PostHog's real one
    // does; an empty script leaves posthog-js waiting and it never sends events.
    const remoteConfig = JSON.stringify({ supportedCompression: ["gzip-js", "base64"], sessionRecording: false });
    if (url.includes("/config.js")) {
      const token = url.match(/\/array\/([^/]+)\/config\.js/)?.[1] ?? "";
      return route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `window._POSTHOG_REMOTE_CONFIG=window._POSTHOG_REMOTE_CONFIG||{};window._POSTHOG_REMOTE_CONFIG[${JSON.stringify(token)}]={config:${remoteConfig},siteApps:[]};`,
      });
    }
    if (url.includes("/config")) return route.fulfill({ status: 200, contentType: "application/json", body: remoteConfig });
    if (url.includes("/flags") || url.includes("/decide"))
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"flags":{},"featureFlags":{},"sessionRecording":false}' });
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"status":1}' });
  });
  page.on("request", (req) => {
    const host = new URL(req.url()).host;
    if (!host.startsWith("localhost") && !host.endsWith(".supabase.co")) thirdParty.push(req.url());
  });
  return { analytics, thirdParty };
}

test("analytics payloads carry no child, family or clinical details", async ({ page }) => {
  test.setTimeout(180_000); // deliberate pauses for posthog-js batch flushes
  const { analytics, thirdParty } = await captureAnalytics(page);
  // PostHog's own debug mode logs every event it builds, properties
  // included, whether or not the batch is sent -- the most direct view of
  // what posthog-js would transmit.
  await page.addInitScript(() => {
    window.localStorage.setItem("ph_debug", "true");
    // posthog-js drops every event from browsers it takes for bots, and
    // automation sets navigator.webdriver -- without this nothing is captured.
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const debugLog: string[] = [];
  page.on("console", async (msg) => {
    if (!/posthog/i.test(msg.text())) return;
    // The text shows objects as "Object"; serialise the real arguments.
    const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => null)));
    const seen = new WeakSet<object>();
    debugLog.push(
      JSON.stringify(args, (_key, value) => {
        if (value && typeof value === "object") {
          if (seen.has(value)) return "[circular]";
          seen.add(value);
        }
        return value;
      })
    );
  });
  const typedSearch = `${s.parentA.childName} Okafor speech delay`;

  await page.goto("/login");
  await page.locator("#email").fill(s.parentA.email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/parent"), { timeout: 30_000 });

  // A pause on each page so posthog-js's ~3s batch timer flushes there,
  // rather than relying on unload beacons.
  for (const path of [
    "/parent/children",
    `/parent/children/${s.parentA.childId}/intake`,
    `/search?query=${encodeURIComponent(typedSearch)}`,
    `/therapists/${s.therapistA.profileId}`,
  ]) {
    await page.goto(path);
    await page.waitForTimeout(4000);
  }
  await page.goto(`/book/${s.therapistA.profileId}/time?type=virtual`);
  await page.waitForTimeout(6000); // let posthog-js flush its last batch

  // Assertions run on what actually leaves the browser (network payloads).
  // The debug log is saved for review but holds posthog-js's internal state
  // (including the raw window.location), which is not itself transmitted.
  const all = analytics.map((c) => `${c.url}\n${c.body}`).join("\n");
  // Full capture kept for review (test-results/ is gitignored).
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/privacy-capture.json", JSON.stringify({ analytics, debugLog }, null, 2));
  console.log(`posthog debug lines: ${debugLog.length}`);
  for (const line of debugLog.filter((l) => /pageview|search_performed/i.test(l)).slice(0, 3)) {
    const at = line.search(/pageview|search_performed/i);
    console.log(`  DEBUG …${line.slice(Math.max(0, at - 120), at + 280).replace(/\s+/g, " ")}`);
  }
  console.log(`captured ${analytics.length} analytics requests, ${all.length} bytes`);
  for (const c of analytics) console.log(`  SAMPLE ${c.url.replace(/^https?:\/\/[^/]+/, "")} :: ${c.body.slice(0, 160).replace(/\s+/g, " ")}`);
  const events = [...all.matchAll(/"event"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  console.log(`events: ${[...new Set(events)].join(", ")}`);
  const urls = [...new Set([...all.matchAll(/"\$current_url"\s*:\s*"([^"]+)"/g)].map((m) => m[1]))];
  console.log(`$current_url values:\n  ${urls.join("\n  ")}`);
  console.log(`third-party requests: ${thirdParty.length ? thirdParty.join(", ") : "none"}`);

  // PostHog must at least be active (start-up and flag calls carry the
  // distinct id and person properties). posthog-js does not emit event
  // batches inside an automated browser even with the bot checks spoofed,
  // so event *properties* are pinned by the sanitizeProps unit tests
  // (src/lib/analytics/events.test.ts) instead of here.
  expect(analytics.length, "PostHog should be active, or this test proves nothing").toBeGreaterThan(0);
  console.log(`event batches observed: ${events.length}`);
  expect(all, "child's name").not.toContain(s.parentA.childName);
  expect(all, "parent's email").not.toContain(s.parentA.email);
  expect(all.toLowerCase(), "typed search term").not.toContain("okafor");
  expect(all, "search query string").not.toContain("query=");
  expect(all, "parent's full name").not.toContain("E2E Parent A");
  expect(all, "phone number").not.toContain("2348000000000");
  expect(thirdParty, "requests to origins other than the app and Supabase").toEqual([]);

  // Recorded, not failed: whether internal ids (the child's id in a URL path)
  // reach analytics. Pseudonymous, but linkable by anyone with database access.
  console.log(`child id present in payloads: ${all.includes(s.parentA.childId)}`);
});
