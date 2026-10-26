import { expect, test, type Page } from "@playwright/test";
import "./types";
/** @param page - Private instance. @returns Completion of mixed geometry setup. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
    { id: "a", shape: "note", x: 100, y: 100, width: 160, height: 100, text: "草稿", style: {} },
    { id: "b", shape: "process", x: 400, y: 100, width: 200, height: 100, text: "发布", style: {} },
  ], edges: [] }); e.select(["a", "b"]); e.fit(); });
}
test("mixed geometry changes only edited fields, undo is atomic and source survives reopen", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "图形属性", exact: true }).click();
  const panel = page.getByRole("form", { name: "位置与尺寸" }); await expect(panel).toBeVisible();
  await expect(panel.getByRole("spinbutton", { name: "宽度", exact: true })).toHaveValue("");
  await panel.getByRole("spinbutton", { name: "宽度", exact: true }).fill("210.5");
  await panel.getByRole("spinbutton", { name: "旋转角度", exact: true }).fill("30");
  await expect(panel.getByRole("button", { name: "应用属性" })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("geometry-light.png") });
  await panel.getByRole("button", { name: "应用属性", exact: true }).click(); await expect(panel).toBeHidden();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes.map(n => n.x)).toEqual([100, 400]); expect(after.nodes.every(n => n.width === 210.5 && n.rotation === 30)).toBe(true);
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload(); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(after.nodes);
});
test("context opens properties; empty values, stale selection and permission cannot write", async ({ page }, info) => {
  await setup(page); await page.evaluate(() => window.flowFixture.editor().focus()); await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "位置与尺寸", exact: true }).click();
  const panel = page.getByRole("form", { name: "位置与尺寸" }); await expect(panel).toBeVisible();
  await panel.getByRole("spinbutton", { name: "高度", exact: true }).fill(""); await expect(panel.getByRole("button", { name: "应用属性" })).toBeDisabled();
  const result = await page.evaluate(() => {
    const e = window.flowFixture.editor(), expected = e.getGeometry(); e.select(["a"]);
    try { e.setGeometry({ x: 50 }, expected); return "unexpected"; } catch (error) { return String(error); }
  }); expect(result).toContain("重新打开"); await expect(panel).toBeHidden();
  await page.setViewportSize({ width: 620, height: 820 }); await page.getByRole("button", { name: "切换明暗主题" }).click();
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await expect(panel).toBeVisible();
  await page.screenshot({ path: info.outputPath("geometry-dark-narrow.png") });
  const box = (await panel.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(620);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "切换只读" }).click(); await expect(page.getByRole("button", { name: "图形属性", exact: true })).toBeDisabled();
});
