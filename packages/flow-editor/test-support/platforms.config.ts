import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Native clipboard permission automation is Chromium-specific. Its real-system
// cases remain in the default suite; WebKit is not claimed as Safari evidence.
export default defineConfig({
  ...base,
  testIgnore: ["clipboard.spec.ts", "performance*.spec.ts"],
  outputDir: "../../../.playwright-results/flow-editor-platforms",
  use: { ...base.use, trace: "retain-on-failure" },
  projects: [
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
