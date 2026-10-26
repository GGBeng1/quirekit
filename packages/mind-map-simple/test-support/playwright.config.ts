import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "*.spec.ts", workers: 1, reporter: "line",
  timeout: 60_000, outputDir: "../../../.playwright-results/mind-map",
  use: { baseURL: "http://127.0.0.1:8992", browserName: "chromium", viewport: { width: 1500, height: 920 } },
  webServer: { command: "pnpm exec vite --config test-support/vite.config.ts",
    url: "http://127.0.0.1:8992", timeout: 60_000, reuseExistingServer: false },
});
