import { rmSync } from "node:fs";
import { join } from "node:path";

import { seed, teardown } from "./seed";

export default async function globalSetup() {
  // Clear anything a previous interrupted run left behind (seeded rows and
  // saved sign-in sessions), then seed fresh.
  await teardown();
  rmSync(join(__dirname, ".auth"), { recursive: true, force: true });
  await seed();
  return async () => {
    await teardown();
  };
}
