import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "*.spec.ts", workers: 1, reporter: "line", timeout: 60_000,
  outputDir: "../../../.playwright-results/flow-editor",
  use: { baseURL: "http://127.0.0.1:8994", browserName: "chromium", viewport: { width: 1440, height: 900 } },
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:8994", timeout: 60_000, reuseExistingServer: !process.env.CI },
});
