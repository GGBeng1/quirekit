import { expect, test } from "@playwright/test";
import type {} from "./types";

test("compact palette keeps shapes visible and named through keyboard, theme and narrow layouts", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 680 });
  await page.goto("/");
  const palette = page.getByRole("complementary", { name: "图形库" });
  const first = palette.getByRole("button", { name: "插入处理", exact: true });
  await expect(first).toBeEnabled();
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());

  // The expanded library remains dense with practical pointer targets; the
  // palette itself scrolls rather than reducing the canvas or shrinking targets.
  const bounds = (await palette.boundingBox())!;
  const shapes = await palette.getByRole("button", { name: /^插入/ }).all();
  expect(shapes).toHaveLength(52);
  for (const shape of shapes) {
    const box = (await shape.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(40);
    expect(box.height).toBeGreaterThanOrEqual(40);
    expect(box.y).toBeGreaterThanOrEqual(bounds.y);

  }
  const firstBox = (await shapes[0]!.boundingBox())!, lastBox = (await shapes.at(-1)!.boundingBox())!;
  expect(lastBox.y + lastBox.height - firstBox.y).toBeLessThan(780);
  await page.screenshot({ path: info.outputPath("palette-light.png") });
  await palette.getByRole("button", { name: "基础图形", exact: true }).click();
  await expect(first).toBeHidden();
  await page.getByRole("textbox", { name: "搜索图形" }).fill("箭头");
  await expect(palette.getByRole("button", { name: /^插入/ })).toHaveCount(6);
  await palette.getByRole("button", { name: "块箭头", exact: true }).click();
  await expect(palette.getByRole("button", { name: "插入向右箭头", exact: true })).toBeHidden();
  await page.getByRole("textbox", { name: "搜索图形" }).fill("no-match");
  await expect(palette.getByRole("status")).toHaveText("没有匹配的图形");
  await page.getByRole("textbox", { name: "搜索图形" }).fill("");
  await expect(first).toBeHidden();
  await palette.getByRole("button", { name: "基础图形", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);

  // Tooltip and button share one focus target; inspecting a shape never edits
  // the document, and activating it preserves the existing insertion/history.
  await page.getByRole("button", { name: "快捷键", exact: true }).focus();
  await page.keyboard.press("Tab");
  // Some platforms give an overflowing scroll container its own native Tab stop.
  // Only that optional stop is accepted before the required search-field focus.
  if (await palette.evaluate(element => element === element.ownerDocument.activeElement)) await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "搜索图形" })).toBeFocused();
  await first.focus(); await expect(first).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText("处理");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  await page.screenshot({ path: info.outputPath("palette-focus.png") });
  await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toBeHidden();
  await expect(first).toBeFocused(); await page.keyboard.press("Enter");
  await expect(page.locator(".x6-node")).toHaveCount(source.nodes.length + 1);
  await expect(page.getByRole("application", { name: "流程图编辑区" })).toBeFocused();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);

  await page.getByRole("button", { name: "切换明暗主题" }).click();
  await first.hover(); await expect(page.getByRole("tooltip")).toHaveText("处理");
  await page.screenshot({ path: info.outputPath("palette-dark.png") });
  await page.keyboard.press("Escape");
  for (const width of [740, 480]) {
    await page.setViewportSize({ width, height: 680 });
    await shapes.at(-1)!.scrollIntoViewIfNeeded();
    const narrow = (await palette.boundingBox())!;
    for (const shape of shapes) {
      const box = (await shape.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(narrow.x);
      expect(box.x + box.width).toBeLessThanOrEqual(narrow.x + narrow.width);
      expect(box.width).toBeGreaterThanOrEqual(40);
    }
    expect((await page.getByRole("application").boundingBox())!.width).toBeGreaterThan(250);
    await page.getByRole("button", { name: "适应画布", exact: true }).click();
    await page.screenshot({ path: info.outputPath(`palette-${width}.png`) });
  }
  await page.getByRole("button", { name: "切换只读" }).click();
  for (const shape of shapes) await expect(shape).toBeDisabled();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
});
