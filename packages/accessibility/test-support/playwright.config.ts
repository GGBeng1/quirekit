import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "*.spec.ts", workers: 1, reporter: "line",
  outputDir: "../../../.playwright-results/accessibility",
  use: { baseURL: "http://127.0.0.1:8985", browserName: "chromium", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm exec vite --config test-support/vite.config.ts",
    url: "http://127.0.0.1:8985/test-support/", reuseExistingServer: false, timeout: 60_000
  }
});
