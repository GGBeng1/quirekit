import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "test-support", testMatch: "*.spec.ts", workers: 1, timeout: 30_000,
  outputDir: "../../.playwright-results/html-sandbox",
  use: { baseURL: "http://127.0.0.1:5194", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }, { name: "firefox", use: { browserName: "firefox" } }, { name: "webkit", use: { browserName: "webkit" } }],
  webServer: { command: "../../apps/block-editor-demo/node_modules/.bin/vite --config test-support/vite.config.mjs", url: "http://127.0.0.1:5194", reuseExistingServer: true },
});
