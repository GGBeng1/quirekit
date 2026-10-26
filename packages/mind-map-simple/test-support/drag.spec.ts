import { expect, test } from "./browser";
import type {} from "./types";

test("small consecutive free-topic moves commit even inside their previous bounds", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    const h = window.mindMapHarness;
    await h.mount(5, "first", { document: { ...h.document(5), version: 2, floatingTopics: [{
      root: { id: "free", text: "自由主题", collapsed: false, children: [] },
      position: { x: 0, y: 150 }, side: "right",
    }] } });
    h.editors[0]!.setZoom(1);
  });
  const free = page.locator("#first .smm-node").filter({ hasText: /^自由主题$/ });
  for (const dx of [12, -12, 80, -80]) {
    const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
    const box = (await free.locator("text").boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 4 }); await page.mouse.up();
    await expect(page.locator("[data-mind-gesture]")).toHaveCount(0);
    await expect.poll(() => page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).floatingTopics![0]!.position.x))
      .toBeCloseTo(before.floatingTopics![0]!.position.x + dx, 0);
  }
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});

test("selection containing the main root pans together when dragged from a selected branch", async ({ page }, info) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount(5));
  const nodes = page.locator("#first .smm-node");
  const root = nodes.filter({ hasText: /^时间管理$/ });
  await root.click();
  for (const index of [1, 2, 3, 4]) await nodes.filter({ hasText: `主题 ${index} · 本周计划` }).click({ modifiers: ["Shift"] });
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(5);
  const before = await page.evaluate(async () => ({ source: await window.mindMapHarness.editors[0]!.getDocument(),
    state: window.mindMapHarness.editors[0]!.getState() }));
  const rootBox = (await root.locator("text").boundingBox())!;
  const branch = (await nodes.filter({ hasText: /^主题 1 · 本周计划$/ }).locator("text").boundingBox())!;
  await page.mouse.move(branch.x + branch.width / 2, branch.y + branch.height / 2); await page.mouse.down();
  await page.mouse.move(branch.x + branch.width / 2, branch.y + branch.height / 2 + 90, { steps: 6 });
  expect((await root.locator("text").boundingBox())!.y - rootBox.y).toBeCloseTo(90, 0);
  await page.screenshot({ path: info.outputPath("whole-selection-pan.png") });
  await page.mouse.up();
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(before.source);
  expect(await page.evaluate(() => window.mindMapHarness.notifications[0])).toBe(0);
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(5);
});

test("clicking blank space after inline editing clears selection without restoring its border", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount(5));
  await page.locator("#first .smm-node").filter({ hasText: /^时间管理$/ }).dblclick();
  await expect(page.locator('#first [contenteditable="true"]')).toBeVisible();
  const surface = (await page.locator("#first").boundingBox())!;
  await page.evaluate(() => window.mindMapHarness.trace.start());
  await page.mouse.move(surface.x + 12, surface.y + 12); await page.mouse.down();
  await expect(page.locator('#first [contenteditable="true"]')).toBeHidden();
  await page.waitForFunction(() => {
    const events = window.mindMapHarness.trace.read().events, start = events.findIndex(event => event.name === "node_tree_render_start");
    return start >= 0 && events.slice(start + 1).some(event => event.name === "node_tree_render_end");
  });
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(0);
  await page.mouse.up();
  expect(await page.evaluate(() => window.mindMapHarness.trace.read().selectionCounts)).toEqual([0]);
});
