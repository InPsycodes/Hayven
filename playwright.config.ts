import { defineConfig, devices } from "@playwright/test";

// Browser journeys against a local production build wired to the STAGING
// Supabase project (see e2e/serve-staging.mjs). Run with `npm run test:e2e`.
// E2E_SKIP_BUILD=1 reuses the last build.
const PORT = process.env.E2E_PORT ?? "3200";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: "node e2e/serve-staging.mjs",
    url: `http://localhost:${PORT}/api/health`,
    timeout: 420_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
