import { test as base } from "@playwright/test";

/** Regression tests own their instance lifecycle; normal navigation starts the preview. */
export const test = base.extend({
  /** @param fixtures - Playwright page. @param use - Test continuation. @returns Test completion. */
  async page({ page }, use) {
    await page.addInitScript(() => { window.mindMapHarnessOnly = true; });
    await use(page);
  },
});
export { expect } from "@playwright/test";
