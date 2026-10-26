import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  testMatch: ["authoring.spec.ts", "gestures.spec.ts", "inline-edit.spec.ts", "lifecycle.spec.ts",
    "extended-layout.spec.ts", "input-frames.spec.ts", "performance.spec.ts", "selection.spec.ts", "overview.spec.ts", "continuous.spec.ts", "paste-fallback.spec.ts", "checkpoint.spec.ts", "translation.spec.ts", "input-cost.spec.ts"],
  outputDir: "../../../.playwright-results/mind-map-matrix",
  projects: ["chromium", "firefox", "webkit"].map(browserName => ({
    name: browserName, use: { browserName: browserName as "chromium" | "firefox" | "webkit" },
  })),
});
