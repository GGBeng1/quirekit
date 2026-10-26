import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
const server = config.webServer;
if (!server || Array.isArray(server)) throw new Error("Expected the canonical mind editor preview server");

// Every browser uses a fresh context, while the canonical preview remains open
// for the user. Reusing this source server never shares test storage or drafts.
export default defineConfig({
  ...config,
  outputDir: "../../../.playwright-results/mind-editor-matrix",
  projects: ["chromium", "firefox", "webkit"].map(browserName => ({
    name: browserName, use: { browserName: browserName as "chromium" | "firefox" | "webkit" },
  })),
  webServer: { ...server, reuseExistingServer: true },
});
