import { expect, test } from "./browser";
import type {} from "./types";

test("layout, undo and redo share document history while retaining viewport and free positions", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    await window.mindMapHarness.mount(5, "first", { document: { ...window.mindMapHarness.document(5), version: 2,
      floatingTopics: [{ root: { id: "free", text: "独立", collapsed: false, children: [
        { id: "free-child", text: "向左子节点", collapsed: false, children: [] },
      ] }, position: { x: -150, y: 180 }, side: "left" }] } });
    const editor = window.mindMapHarness.editors[0]!; editor.select("n1"); editor.setZoom(0.7);
  });
  const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  const viewport = await page.evaluate(() => { const { x, y, scale } = window.mindMapHarness.editors[0]!.getState(); return { x, y, scale }; });
  for (const layout of ["logical-left", "logical-right"] as const) {
    await page.evaluate(next => window.mindMapHarness.editors[0]!.setLayout(next), layout);
    const current = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
    expect(current).toEqual({ ...before, layout });
    expect(await page.evaluate(() => { const { x, y, scale } = window.mindMapHarness.editors[0]!.getState(); return { x, y, scale }; })).toEqual(viewport);
    const root = (await page.locator("#first .smm-node").filter({ hasText: /^时间管理$/ }).boundingBox())!;
    for (const node of await page.locator("#first .smm-node").filter({ hasText: /^主题 \d · 本周计划$/ }).all()) {
      const box = (await node.boundingBox())!;
      expect(layout === "logical-left" ? box.x < root.x : box.x > root.x).toBe(true);
    }
    const free = (await page.locator("#first .smm-node").filter({ hasText: /^独立$/ }).boundingBox())!;
    const child = (await page.locator("#first .smm-node").filter({ hasText: /^向左子节点$/ }).boundingBox())!;
    expect(child.x).toBeLessThan(free.x);
  }
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("undo"));
  expect((await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).layout).toBe("logical-left");
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("undo"));
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(before);
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("redo"));
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().layout)).toBe("logical-left");
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});
