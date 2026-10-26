import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  reporter: "line",
  outputDir: "../../../.playwright-results/block-editor",
  use: { baseURL: "http://127.0.0.1:8986", browserName: "chromium" },
  webServer: {
    command: "pnpm exec vite --config test-support/vite.config.ts",
    url: "http://127.0.0.1:8986",
    reuseExistingServer: false,
    timeout: 60_000
  }
});
