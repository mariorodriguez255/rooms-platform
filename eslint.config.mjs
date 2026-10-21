import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The client with the secret key bypasses RLS: only the public
  // application form may use it (ADR 0010).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/apply/**", "src/lib/applications/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message:
                "The secret-key client bypasses RLS: only src/app/apply and src/lib/applications may use it (ADR 0010).",
            },
          ],
        },
      ],
    },
  },
  // Must be last: turns off rules that conflict with Prettier.
  prettier,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test and coverage output:
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
