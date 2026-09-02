import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // k6 load-test scripts -- run by the k6 binary (its own goja runtime and
    // `k6/*` module resolver), not part of the Next app or its tsconfig.
    "load-test/**",
  ]),
]);

export default eslintConfig;
