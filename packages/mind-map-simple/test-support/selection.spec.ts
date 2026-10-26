import { expect, test } from "./browser";
import type {} from "./types";

test("blank click followed by a quick marquee preserves selection after the second release", async ({ page }, info) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => { await window.mindMapHarness.mount(5); window.mindMapHarness.editors[0]!.setZoom(0.8); });
  const area = (await page.locator("#first").boundingBox())!;
  const start = { x: area.x + 12, y: area.y + 12 }, end = { x: area.x + area.width - 12, y: area.y + area.height - 12 };
  await page.mouse.click(start.x, start.y);
  // Native mouse input counts the following press as the second click. The test
  // driver needs that count explicitly to produce the browser's trailing dblclick.
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await expect.poll(() => page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(5);
  await page.mouse.up({ clickCount: 2 });
  await expect(page.locator("[data-mind-gesture]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(5);
  const source = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(source.version).toBe(1); expect(source.floatingTopics).toBeUndefined();
  expect(await page.evaluate(() => window.mindMapHarness.notifications[0])).toBe(0);
  await page.screenshot({ path: info.outputPath("quick-marquee-selection.png") });

  // A new press has its own click sequence; previous drag suppression must not
  // swallow later blank clicks, node selection, editing or free-topic creation.
  await page.mouse.click(end.x, end.y);
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(0);
  const node = page.locator("#first .smm-node").filter({ hasText: /^主题 1 · 本周计划$/ });
  await node.click();
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedId)).toBe("n1");
  await node.dblclick(); await expect(page.locator('#first [contenteditable="true"]')).toBeVisible();
  await page.keyboard.press("Enter");
  await page.mouse.dblclick(start.x, start.y);
  await expect.poll(() => page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).floatingTopics?.length)).toBe(1);
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});

test("click then branch drag does not turn its trailing double-click into another topic", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount(5));
  const branch = page.locator("#first .smm-node").filter({ hasText: /^主题 1 · 本周计划$/ });
  const box = (await branch.locator("text").boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.move(x, y + 150, { steps: 6 }); await page.mouse.up({ clickCount: 2 });
  await expect(page.locator("[data-mind-gesture]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).floatingTopics?.map(topic => topic.root.id)))
    .toEqual(["n1"]);
  await expect(page.locator('#first [contenteditable="true"]')).toBeHidden();
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("undo"));
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument()))
    .toEqual(await page.evaluate(() => window.mindMapHarness.document(5)));
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});
