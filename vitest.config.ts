import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: [
      // `server-only` throws when imported outside a react-server context.
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)) },
    ],
  },
});
