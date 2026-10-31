import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "supabase/**/*.test.ts"],
  },
  resolve: {
    alias: [
      // `server-only` throws when imported outside a react-server context.
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)) },
      // Matches tsconfig.json's "@/*" -> "./src/*" -- vitest doesn't read
      // tsconfig paths on its own, so any unit test on a module that
      // imports via "@/..." (most of src/lib) failed to resolve without
      // this, independent of whether the test itself used the alias.
      { find: /^@\/(.*)$/, replacement: fileURLToPath(new URL("./src/$1", import.meta.url)) },
    ],
  },
});
