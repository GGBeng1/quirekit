import { defineConfig } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: ".",
  testMatch: "browser/evidence.e2e.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  outputDir: path.resolve(process.cwd(), ".playwright-results/fnd-drag"),
  use: {
    baseURL: "http://127.0.0.1:8976",
    browserName: "chromium"
  },
  webServer: {
    command: "pnpm --filter @quirekit/view exec vite src/view/shared/block-interaction/test-support --config src/view/shared/block-interaction/test-support/vite.config.ts",
    url: "http://127.0.0.1:8976",
    reuseExistingServer: false,
    timeout: 120_000
  }
});
