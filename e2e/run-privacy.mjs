// Runs the analytics privacy check: rebuilds with a dummy PostHog key
// (E2E_ANALYTICS=1, see serve-staging.mjs) and runs e2e/privacy.spec.ts.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["playwright", "test", "e2e/privacy.spec.ts", "--project=desktop"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, E2E_ANALYTICS: "1" },
});
process.exit(result.status ?? 1);
