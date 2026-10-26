import { expect, test, type Page } from "@playwright/test";
import type {} from "./types";

/** @param page - Isolated editor. @returns Pointer pressed on the palette's rectangle. */
async function pressShape(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "插入处理", exact: true });
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
});

for (const scale of [0.65, 1.4]) test(`palette tracks the pointer at zoom ${scale} and commits exactly one undoable node`, async ({ page }, info) => {
  await page.evaluate(scale => window.flowFixture.editor().setZoom(scale), scale);
  const canvas = (await page.getByRole("application", { name: "流程图编辑区" }).boundingBox())!;
  await page.mouse.move(canvas.x + 25, canvas.y + 25); await page.mouse.down({ button: "middle" });
  await page.mouse.move(canvas.x + 85, canvas.y + 55, { steps: 5 }); await page.mouse.up({ button: "middle" });
  const before = await page.evaluate(async () => ({ source: await window.flowFixture.editor().getDocument(), state: window.flowFixture.editor().getState(), changes: window.flowFixture.invalidations() }));
  await pressShape(page);
  let point = { x: 0, y: 0 };
  for (let step = 0; step < 4; step++) {
    point = { x: Math.round(canvas.x + canvas.width * .45 + step * 18), y: Math.round(canvas.y + canvas.height * .6 + step * 11) };
    await page.mouse.move(point.x, point.y);
    const ghost = page.locator("[data-flow-placement-preview]"); await expect(ghost).toBeVisible();
    const bounds = (await ghost.boundingBox())!;
    expect(bounds.x + bounds.width / 2).toBeCloseTo(point.x, 0);
    expect(bounds.y + bounds.height / 2).toBeCloseTo(point.y, 0);
    await expect(page.locator(".x6-node")).toHaveCount(before.source.nodes.length);
    expect(await page.evaluate(() => window.flowFixture.invalidations())).toBe(before.changes);
    expect(await page.evaluate(() => window.flowFixture.editor().getState().canUndo)).toBe(before.state.canUndo);
  }
  await page.screenshot({ path: info.outputPath("palette-drag-preview.png") });
  await page.mouse.up(); await expect(page.locator("[data-flow-placement-preview]")).toHaveCount(0);
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes).toHaveLength(before.source.nodes.length + 1);
  const added = after.nodes.find(node => !before.source.nodes.some(old => old.id === node.id))!;
  expect(added.x + added.width / 2).toBeCloseTo((point.x - canvas.x - before.state.x) / scale, 0);
  expect(added.y + added.height / 2).toBeCloseTo((point.y - canvas.y - before.state.y) / scale, 0);
  const actual = (await page.locator(`.x6-node[data-cell-id="${added.id}"]`).boundingBox())!;
  expect(actual.x + actual.width / 2).toBeCloseTo(point.x, 0);
  expect(actual.y + actual.height / 2).toBeCloseTo(point.y, 0);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before.source);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(after);
});

test("outside release, Escape and permission revocation cancel without source or history changes", async ({ page }) => {
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const canvas = (await page.getByRole("application", { name: "流程图编辑区" }).boundingBox())!;
  for (const cancel of ["outside", "escape", "readonly"] as const) {
    await pressShape(page); await page.mouse.move(canvas.x + 250, canvas.y + 200, { steps: 6 });
    await expect(page.locator("[data-flow-placement-preview]")).toBeVisible();
    if (cancel === "outside") await page.mouse.move(canvas.x - 20, canvas.y + 100);
    if (cancel === "escape") await page.keyboard.press("Escape");
    if (cancel === "readonly") {
      await page.evaluate(() => window.flowFixture.editor().setReadOnly(true));
      await expect(page.locator("[data-flow-placement-preview]")).toHaveCount(0);
      await page.evaluate(() => window.flowFixture.editor().setReadOnly(false));
    }
    await page.mouse.up(); await expect(page.locator("[data-flow-placement-preview]")).toHaveCount(0);
    expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
    expect(await page.evaluate(() => window.flowFixture.editor().getState().canUndo)).toBe(false);
    if (cancel === "readonly") await page.evaluate(() => window.flowFixture.editor().setReadOnly(false));
  }
  // Cancellation must also remove the click guard before a fresh activation.
  await page.getByRole("button", { name: "插入处理", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toHaveLength(source.nodes.length + 1);
});

test("destroying a palette gesture removes preview and pointer listeners", async ({ page }) => {
  const canvas = (await page.getByRole("application", { name: "流程图编辑区" }).boundingBox())!;
  await pressShape(page); await page.mouse.move(canvas.x + 200, canvas.y + 200);
  await expect(page.locator("[data-flow-placement-preview]")).toBeVisible();
  await page.evaluate(() => window.flowFixture.editor().destroy());
  await page.mouse.move(canvas.x + 260, canvas.y + 250); await page.mouse.up();
  await expect(page.locator("[data-flow-placement-preview]")).toHaveCount(0);
});

test("pointer cancellation, lost capture and window blur leave no insertion", async ({ page }) => {
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const canvas = (await page.getByRole("application", { name: "流程图编辑区" }).boundingBox())!;
  for (const reason of ["pointercancel", "lostpointercapture", "blur"] as const) {
    await pressShape(page); await page.mouse.move(canvas.x + 220, canvas.y + 180);
    await expect(page.locator("[data-flow-placement-preview]")).toBeVisible();
    await page.evaluate(reason => {
      if (reason === "blur") window.dispatchEvent(new Event("blur"));
      else document.querySelector('[aria-label="插入处理"]')!.dispatchEvent(new PointerEvent(reason, { pointerId: 1, bubbles: true }));
    }, reason);
    await expect(page.locator("[data-flow-placement-preview]")).toHaveCount(0);
    await page.mouse.up(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  }
});
