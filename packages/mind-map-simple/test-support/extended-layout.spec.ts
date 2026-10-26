import { expect, test } from "./browser";
import type {} from "./types";
test("organization and timeline retain forest positions, edits, full snapshots and undo", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    const base = window.mindMapHarness.document(5);
    await window.mindMapHarness.mount(5, "first", { document: { ...base, version: 2, floatingTopics: [{ root: { id: "free", text: "独立", collapsed: false,
      children: [{ id: "child", text: "自由后代", collapsed: false, children: [] }] }, position: { x: -200, y: 200 }, side: "left" }] } });
  });
  const original = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  for (const layout of ["organization", "timeline"] as const) {
    await page.evaluate(value => window.mindMapHarness.editors[0]!.setLayout(value), layout);
    const source = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
    expect(source).toEqual({ ...original, version: 6, layout, annotations: [] });
    const root = (await page.locator("#first .smm-node").filter({ hasText: /^时间管理$/ }).boundingBox())!;
    const branch = (await page.locator("#first .smm-node").filter({ hasText: /^主题 2 · 本周计划$/ }).boundingBox())!;
    expect(layout === "organization" ? branch.y > root.y + root.height : branch.x > root.x + root.width).toBe(true);
    const free = (await page.locator("#first .smm-node").filter({ hasText: /^独立$/ }).boundingBox())!;
    const child = (await page.locator("#first .smm-node").filter({ hasText: /^自由后代$/ }).boundingBox())!;
    expect(layout === "organization" ? child.y > free.y + free.height : child.x > free.x + free.width).toBe(true);
    const geometry = await page.evaluate(() => window.mindMapHarness.editors[0]!.getOverview().topics);
    const rootWorld = geometry.find(n => n.id === "n0")!, freeWorld = geometry.find(n => n.id === "free")!;
    expect(freeWorld.x - rootWorld.x).toBeCloseTo(-200, 0); expect(freeWorld.y - rootWorld.y).toBeCloseTo(200, 0);
    const svg = await page.evaluate(() => window.mindMapHarness.editors[0]!.exportSvg());
    expect(svg.svg).toContain("自由后代"); expect(svg.width).toBeGreaterThan(0);
    await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("undo"));
    expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(original);
  }
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});
