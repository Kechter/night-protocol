import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  // Fail fast on first failure in CI
  fullyParallel: false,
  retries: 1,

  use: {
    // Local dev server (npm run serve or VS Code Live Server)
    baseURL: "http://localhost:5500",
    // Keep a screenshot on every failure
    screenshot: "only-on-failure",
    // Record video on first retry
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start the static file server automatically before tests
  webServer: {
    command: "npx http-server . -p 5500 -c-1 --cors",
    url: "http://localhost:5500",
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
