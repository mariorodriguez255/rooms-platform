import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const port = 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "es-ES",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    // Candidates will mostly apply from their phones (milestone 3).
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // CI tests the production build; locally the dev server is enough.
    command: isCI ? `pnpm start --port ${port}` : `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
