import { expect, test } from "./browser";
import type {} from "./types";

test("container-only resize updates the SVG clipping boundary", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount());
  await page.locator("#first").evaluate(element => { element.style.width = "1150px"; });
  await expect.poll(() => page.locator("#first [data-quirekit-mind-map]").evaluate(element => {
    return Math.abs(element.clientWidth - element.querySelector("svg")!.getBoundingClientRect().width);
  })).toBeLessThan(1);
});

test("small wheel deltas stay small without changing source or scrolling the host", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount());
  const node = page.locator("#first .smm-node").filter({ hasText: "时间管理" });
  const before = await node.boundingBox();
  const changes = await page.evaluate(() => window.mindMapHarness.notifications[0]);
  await page.locator("#first").hover();
  await page.mouse.wheel(0, 20);
  await expect.poll(async () => (await node.boundingBox())!.y).not.toBe(before!.y);
  const moved = Math.abs((await node.boundingBox())!.y - before!.y);
  expect(moved).toBeLessThanOrEqual(12);
  expect(moved).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => window.mindMapHarness.notifications[0])).toBe(changes);
});

test("viewport gestures finish native edits and zoom around the pointer", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    await window.mindMapHarness.mount();
    window.mindMapHarness.editors[0]!.select("n0");
    await window.mindMapHarness.editors[0]!.execute("edit-text");
  });
  const input = page.locator('#first [contenteditable="true"]');
  await input.fill("缩放前完成中文编辑");
  const surface = page.locator("#first [data-quirekit-mind-map]");
  const rect = (await surface.boundingBox())!;
  // WheelEvent client coordinates are integer CSS pixels even with fractional layout.
  const clientX = Math.round(rect.x + 20), clientY = Math.round(rect.y + 20);
  const anchorX = clientX - rect.x, anchorY = clientY - rect.y;
  await page.mouse.move(clientX, clientY);
  await page.mouse.wheel(0, 20);
  await expect(input).not.toBeVisible();
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).root.text)).toBe("缩放前完成中文编辑");
  const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getState());
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -50);
  await page.keyboard.up("Control");
  await expect.poll(() => page.evaluate(() => window.mindMapHarness.editors[0]!.getState().scale)).toBeGreaterThan(before.scale);
  const after = await page.evaluate(() => window.mindMapHarness.editors[0]!.getState());
  expect((anchorX - after.x) / after.scale).toBeCloseTo((anchorX - before.x) / before.scale, 1);
  expect((anchorY - after.y) / after.scale).toBeCloseTo((anchorY - before.y) / before.scale, 1);
  await page.locator("#first .smm-node").filter({ hasText: "缩放前完成中文编辑" }).dblclick();
  await expect(input).toBeVisible();
  const node = (await page.locator("#first .smm-node").filter({ hasText: "缩放前完成中文编辑" }).boundingBox())!;
  const overlay = (await input.boundingBox())!;
  expect(overlay.x).toBeGreaterThanOrEqual(node.x);
  expect(overlay.x + overlay.width).toBeLessThanOrEqual(node.x + node.width + 1);
});
