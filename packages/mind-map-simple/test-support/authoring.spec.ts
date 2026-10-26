import { expect, test } from "./browser";
import type {} from "./types";

test("queued writes recheck readonly and destruction without poisoning subsequent commands", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount(5));
  const outcome = await page.evaluate(async () => {
    const editor = window.mindMapHarness.editors[0]!;
    editor.select("n0");
    const pending = editor.execute("add-child");
    editor.setReadOnly(true);
    const rejected = await pending.then(() => false, () => true);
    const readOnlySource = await editor.getDocument();
    editor.setReadOnly(false); editor.select("n0"); await editor.execute("add-child");
    const edited = await editor.getDocument();
    const doomed = editor.setLayout("logical-left");
    const destroyed = editor.destroy();
    const cancelled = await doomed.then(() => false, () => true);
    await destroyed;
    return { rejected, cancelled, readOnlySource, edited };
  });
  expect(outcome.rejected).toBe(true); expect(outcome.cancelled).toBe(true);
  expect(outcome.readOnlySource.root.children).toHaveLength(4);
  expect(outcome.edited.root.children).toHaveLength(5);
  await expect(page.locator("#first [data-quirekit-mind-map]")).toHaveCount(0);
});
