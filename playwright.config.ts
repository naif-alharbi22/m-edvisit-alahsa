import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a seeded database (`npm run db:reset-demo`).
 * By default Playwright starts the production build (`npm run build` first);
 * set E2E_BASE_URL to test an already running instance instead.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: `${baseURL}/api/health`,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: { PORT: "3000", HOSTNAME: "127.0.0.1", RATE_LIMIT_ENABLED: "false" },
      },
});
