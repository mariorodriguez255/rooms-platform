import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Integration tests: real requests to the local Supabase (pnpm db:start),
// through the same API the app uses. Kept apart from the unit tests so that
// `pnpm test` needs no database.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // .env.local (local keys from `pnpm db:status`), without the VITE_ filter.
    env: loadEnv("test", process.cwd(), ""),
    testTimeout: 20_000,
    // The suites share one database: run them one after another.
    fileParallelism: false,
  },
});
