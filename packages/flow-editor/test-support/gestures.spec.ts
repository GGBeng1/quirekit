import { expect, test, type Page } from "@playwright/test";
import type {} from "./types";

/** @param page - Isolated preview. @returns Visible first two nodes and their surrounding empty space. */
async function marqueeBounds(page: Page) {
  const first = (await page.locator('.x6-node[data-cell-id="publish-n0"]').boundingBox())!;
  const second = (await page.locator('.x6-node[data-cell-id="publish-n1"]').boundingBox())!;
  return { left: Math.round(first.x - 24), top: Math.round(first.y - 24), right: Math.round(second.x + second.width + 24), bottom: Math.round(second.y + second.height + 24) };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
});

test("blank left drag tracks a marquee without panning or reading document source", async ({ page }, info) => {
  const before = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument(), read = editor.getDocument;
    let reads = 0;
    editor.getDocument = () => { reads++; return read(); };
    Object.assign(window, { flowGestureReads: () => reads });
    return { source, state: editor.getState(), changes: window.flowFixture.invalidations() };
  });
  const area = await marqueeBounds(page);
  expect(await page.getByRole("application").evaluate(e => getComputedStyle(e).cursor)).toBe("default");
  await page.mouse.move(area.left, area.top); await page.mouse.down();
  // Inspect the live rectangle at every real pointer step; a correct final
  // selection alone would miss a canvas that pans while the button is held.
  for (let step = 1; step <= 5; step++) {
    const dx = (area.right - area.left) * step / 5, dy = (area.bottom - area.top) * step / 5;
    await page.mouse.move(area.left + dx, area.top + dy);
    const rectangle = page.locator(".x6-widget-selection-rubberband");
    await expect(rectangle).toBeVisible();
    const bounds = (await rectangle.boundingBox())!;
    expect(bounds.x).toBeCloseTo(area.left, 0); expect(bounds.y).toBeCloseTo(area.top, 0);
    // Native mouse coordinates are integer CSS pixels even when fitted node
    // bounds are fractional. Permit only that one-pixel input quantization.
    expect(Math.abs(bounds.width - dx)).toBeLessThanOrEqual(1); expect(Math.abs(bounds.height - dy)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => window.flowFixture.editor().getState())).toMatchObject({
      x: before.state.x, y: before.state.y, scale: before.state.scale, canUndo: false,
    });
  }
  await page.screenshot({ path: info.outputPath("marquee-during-drag.png") });
  await page.mouse.up();
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["publish-n0", "publish-n1"]);
  expect(await page.evaluate(() => (window as unknown as { flowGestureReads(): number }).flowGestureReads())).toBe(0);
  expect(await page.evaluate(() => window.flowFixture.invalidations())).toBe(before.changes);
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before.source);
  await page.screenshot({ path: info.outputPath("marquee-selected.png") });
  await page.mouse.click(area.left, area.top);
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual([]);
});

test("middle drag pans independently; transformed reverse marquee and read-only preserve content", async ({ page }) => {
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n4"]));
  const before = await page.evaluate(async () => ({
    source: await window.flowFixture.editor().getDocument(), state: window.flowFixture.editor().getState(), changes: window.flowFixture.invalidations(),
  }));
  const canvas = (await page.getByRole("application", { name: "流程图编辑区" }).boundingBox())!;
  const start = { x: canvas.x + 30, y: canvas.y + 30 };
  await page.mouse.move(start.x, start.y); await page.mouse.down({ button: "middle" });
  for (let step = 1; step <= 5; step++) {
    await page.mouse.move(start.x + step * 9, start.y + step * 5);
    await expect(page.locator(".x6-widget-selection-rubberband")).toHaveCount(0);
    expect(await page.getByRole("application").evaluate(e => getComputedStyle(e).cursor)).toBe("grabbing");
    const state = await page.evaluate(() => window.flowFixture.editor().getState());
    expect(state.x).toBeCloseTo(before.state.x + step * 9); expect(state.y).toBeCloseTo(before.state.y + step * 5);
    expect(state.selectedIds).toEqual(before.state.selectedIds);
  }
  await page.mouse.up({ button: "middle" });
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(before.state.selectedIds);
  await page.mouse.wheel(20, 30);
  await expect.poll(() => page.evaluate(() => window.flowFixture.editor().getState().x)).toBeCloseTo(before.state.x + 25);
  await page.getByRole("button", { name: "缩小", exact: true }).click();
  await page.getByRole("button", { name: "切换只读" }).click();
  const view = await page.evaluate(() => window.flowFixture.editor().getState());
  const area = await marqueeBounds(page);
  await page.mouse.move(area.right, area.bottom); await page.mouse.down();
  await page.mouse.move(area.left, area.top, { steps: 5 }); await page.mouse.up();
  expect(await page.evaluate(() => window.flowFixture.editor().getState())).toMatchObject({
    x: view.x, y: view.y, scale: view.scale, selectedIds: ["publish-n0", "publish-n1"], readOnly: true, canUndo: false,
  });
  const box = (await page.locator('.x6-node[data-cell-id="publish-n0"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 25, { steps: 5 }); await page.mouse.up();
  expect(await page.evaluate(() => window.flowFixture.invalidations())).toBe(before.changes);
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before.source);
});

test("native composition owns input while a blank canvas drag is attempted", async ({ page }) => {
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.locator('.x6-node[data-cell-id="publish-n1"]').dblclick();
  const input = page.getByRole("textbox", { name: "图形文字" });
  await input.dispatchEvent("compositionstart", { data: "" }); await input.fill("正在输入中文");
  await input.dispatchEvent("compositionupdate", { data: "中文" });
  const state = await page.evaluate(() => window.flowFixture.editor().getState());
  const area = await marqueeBounds(page);
  await page.mouse.move(area.left, area.top); await page.mouse.down();
  await page.mouse.move(area.right, area.bottom, { steps: 5 }); await page.mouse.up();
  await expect(page.locator(".x6-widget-selection-rubberband")).toHaveCount(0);
  await expect(input).toBeFocused(); await expect(input).toHaveValue("正在输入中文");
  expect(await page.evaluate(() => window.flowFixture.editor().getState())).toEqual(state);
  await input.dispatchEvent("compositionend", { data: "中文" }); await input.press("Escape");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
});
