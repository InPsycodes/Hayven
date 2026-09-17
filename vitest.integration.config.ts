import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts on purpose: these tests hit a real
// (throwaway, never production) Supabase project over the network, so they
// need .env.test loaded, a much longer timeout, and to run sequentially --
// several scenarios deliberately create real concurrent requests to prove a
// race is actually closed, which only means something if nothing else is
// racing the same rows at the same time.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/integration/**/*.integration.test.ts"],
    env: { NODE_ENV: "test" },
    setupFiles: ["./test/integration/env.ts", "./test/integration/mocks.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: [
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
    ],
  },
});
