import { expect, test } from "./browser";
import type {} from "./types";

test("direction keys follow branches, reveal clipped nodes, and leave text keys native", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => { await window.mindMapHarness.mount(21); window.mindMapHarness.editors[0]!.select("n0"); });
  await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedId)).toBe("n1");
  await page.keyboard.press("ArrowLeft");
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedId)).toBe("n0");
  await page.keyboard.press("ArrowLeft");
  expect(["n2", "n4"]).toContain(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedId));
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(0);
  await page.keyboard.press("Home");
  await page.evaluate(() => window.mindMapHarness.editors[0]!.setZoom(3));
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
  const selected = await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedId);
  const bounds = (await page.locator("#first [data-quirekit-mind-map]").boundingBox())!;
  const label = await page.evaluate(async id => {
    const doc = await window.mindMapHarness.editors[0]!.getDocument();
    return doc.root.children.flatMap(node => node.children).find(node => node.id === id)?.text;
  }, selected);
  const box = (await page.locator("#first .smm-node").filter({ hasText: label! }).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(bounds.x);
  expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  await page.keyboard.press("F2");
  const input = page.locator('#first [contenteditable="true"]');
  await expect(input).toBeVisible(); await input.press("ControlOrMeta+a");
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedId)).toBe(selected);
  await input.press("ArrowLeft"); await input.press("Enter");
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});

test("1000-node selection navigation performs no layouts or source/history reads", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => { await window.mindMapHarness.mount(1000); window.mindMapHarness.editors[0]!.select("n0"); });
  await page.evaluate(() => window.mindMapHarness.trace.start());
  await page.keyboard.press("ControlOrMeta+a");
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(1000);
  await page.keyboard.press("Escape"); await page.keyboard.press("Home");
  for (let i = 0; i < 5; i++) { await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowLeft"); }
  const trace = await page.evaluate(() => window.mindMapHarness.trace.read());
  expect(trace.sourceReads).toBe(0); expect(trace.historyReads).toBe(0);
  expect(trace.events.filter(event => event.name === "node_tree_render_start")).toHaveLength(0);
  expect(trace.selectionUpdates).toBeLessThanOrEqual(13);
  expect(await page.evaluate(() => window.mindMapHarness.notifications[0])).toBe(0);
});
