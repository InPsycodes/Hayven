// Seeds the synthetic E2E users on STAGING, runs the k6 load test with their
// details, then removes them -- also when k6 fails. `npm run test:load`.
// k6 must be installed (https://grafana.com/docs/k6/latest/set-up/install-k6/).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { seed, teardown, E2E_PASSWORD } = await jiti.import("../seed.ts");

const env = {};
for (const line of readFileSync(new URL("../../.env.test", import.meta.url), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const state = await seed();
let status = 1;
try {
  const k6 = spawnSync("k6", ["run", "--summary-export", "e2e/load/last-summary.json", "e2e/load/staging-load.js"], {
    stdio: "inherit",
    env: {
      ...process.env,
      SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      PASSWORD: E2E_PASSWORD,
      PARENT_A_EMAIL: state.parentA.email,
      PARENT_B_EMAIL: state.parentB.email,
      CHILD_A_ID: state.parentA.childId,
      CHILD_B_ID: state.parentB.childId,
      THERAPIST_A_PROFILE_ID: state.therapistA.profileId,
    },
  });
  status = k6.status ?? 1;
} finally {
  await teardown();
}
process.exit(status);
