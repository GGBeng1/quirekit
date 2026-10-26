import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  reporter: "line",
  outputDir: "../../../.playwright-results/native-dom",
  use: { baseURL: "http://127.0.0.1:8984", browserName: "chromium" },
  webServer: {
    command: "pnpm exec vite --config test-support/vite.config.ts",
    url: "http://127.0.0.1:8984",
    reuseExistingServer: false,
    timeout: 60_000
  }
});
