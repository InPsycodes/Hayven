// Builds and serves the app for the Playwright suite against the STAGING
// Supabase project only (hayven_load_test). Values from .env.test override
// .env.local (Next never overwrites variables already in process.env), and
// analytics, email and error reporting are switched off so synthetic test
// data never reaches PostHog, Resend or Sentry.
import { readFileSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";

const STAGING_REF = "sfvwfbgrfmqaaakbepll";
const PRODUCTION_REF = "cfzbhibpwcerbxgawxqi";
const PORT = process.env.E2E_PORT ?? "3200";

const env = { ...process.env };
for (const line of readFileSync(new URL("../.env.test", import.meta.url), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq > 0) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}
if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes(STAGING_REF) || env.NEXT_PUBLIC_SUPABASE_URL.includes(PRODUCTION_REF)) {
  console.error("serve-staging: refusing to run, .env.test does not point at the staging project.");
  process.exit(1);
}
Object.assign(env, {
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  NEXT_PUBLIC_POSTHOG_KEY: "",
  NEXT_PUBLIC_GA_MEASUREMENT_ID: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  RESEND_API_KEY: "",
  VAPID_PRIVATE_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
});
delete env.DATABASE_URL;

const shell = process.platform === "win32";
if (!process.env.E2E_SKIP_BUILD) {
  const build = spawnSync("npx", ["next", "build"], { env, stdio: "inherit", shell });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
spawn("npx", ["next", "start", "-p", PORT], { env, stdio: "inherit", shell });
