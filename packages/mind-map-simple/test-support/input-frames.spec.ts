import { expect, test } from "./browser";
import type {} from "./types";

test("a native input burst coalesces geometry and commits its latest value exactly once", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    const h = window.mindMapHarness; await h.mount(1000); const editor = h.editors[0]!;
    editor.select("n0"); await editor.execute("edit-text");
  });
  const input = page.locator('#first [contenteditable="true"]');
  await expect(input).toBeVisible();
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.mindMapHarness.trace.start();
  });
  await input.evaluate(element => {
    for (let value = 1; value <= 10; value++) {
      element.textContent = `连续输入${value}`;
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: String(value) }));
    }
  });
  await expect.poll(() => page.evaluate(() => window.mindMapHarness.trace.read().events.filter(event => event.name === "node_tree_render_end").length)).toBe(1);
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness; h.trace.stop(); const trace = h.trace.read(), editor = h.editors[0]!;
    const beforeCommit = h.notifications[0], source = await editor.getDocument(); await editor.execute("undo");
    const restored = await editor.getDocument(); await editor.destroy(); return { trace, beforeCommit, source, restored };
  });
  expect(result.trace.events.filter(event => event.name === "node_text_edit_change")).toHaveLength(10);
  expect(result.trace.sourceReads).toBe(0); expect(result.trace.historyReads).toBe(0); expect(result.beforeCommit).toBe(0);
  expect(result.source.root.text).toBe("连续输入10"); expect(result.restored.root.text).toBe("时间管理");
});
