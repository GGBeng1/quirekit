import { openFlowObject } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import "./types";
/** @param page - Private fixture. @returns Completion of a transformed linked selection. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
    { id: "a", shape: "note", x: 100, y: 100, width: 180, height: 100, rotation: 25, flipX: true, text: "需要保留", style: { fill: "#ffcc88", drawing: "sketch" } },
    { id: "b", shape: "process", x: 500, y: 100, width: 180, height: 100, text: "下一步", style: {} },
  ], edges: [{ id: "e", source: { node: "a", port: "right" }, target: { node: "b", anchor: { x: 0, y: 0.6 } }, vertices: [{ x: 390, y: 40 }], label: "仍连接", labelPosition: 0.4, routing: "orthogonal", style: {} }] }); e.select(["a", "b"]); e.fit(); });
}
test("shape picker previews and atomically replaces multiple silhouettes without losing connections", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const oldPath = await page.locator('.x6-node[data-cell-id="a"] > path').first().getAttribute("d");
  await openFlowObject(page, "shape");
  const panel = page.getByRole("region", { name: "更换图形", exact: true });
  await expect(panel).toBeVisible(); await page.screenshot({ path: info.outputPath("replace-light.png") });
  await panel.getByRole("textbox", { name: "查找替换图形" }).fill("decision");
  await panel.getByRole("button", { name: /更换为/ }).click();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after).toEqual({ ...before, nodes: before.nodes.map(n => ({ ...n, shape: "decision" })) });
  expect(await page.locator('.x6-node[data-cell-id="a"] > path').first().getAttribute("d")).not.toBe(oldPath);
  const svg = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(JSON.parse(svg.source)).toEqual(after); expect(svg.svg).toContain("需要保留");
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(after);
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload(); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(after.nodes);
});
test("context replacement cancels stale targets and fits a narrow dark viewport", async ({ page }, info) => {
  await setup(page); await page.evaluate(() => window.flowFixture.editor().focus()); await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "更换图形", exact: true }).click();
  const panel = page.getByRole("region", { name: "更换图形", exact: true }); await expect(panel).toBeVisible();
  expect(await page.evaluate(() => { const e = window.flowFixture.editor(), expected = e.getGeometry(); e.select(["b"]); try { e.replaceShape("circle", expected); return "unexpected"; } catch (error) { return String(error); } })).toContain("重新打开");
  await expect(panel).toBeHidden(); await page.setViewportSize({ width: 620, height: 820 }); await page.getByRole("button", { name: "切换明暗主题" }).click();
  await openFlowObject(page, "shape"); await expect(panel).toBeVisible(); await page.screenshot({ path: info.outputPath("replace-dark-narrow.png") });
  const box = (await panel.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(620);
  await page.keyboard.press("Escape"); await page.evaluate(() => window.flowFixture.editor().select(["a", "e"]));
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await expect(page.getByRole("tab", { name: "更换形状", exact: true })).toBeDisabled(); await page.keyboard.press("Escape");
  await page.evaluate(() => window.flowFixture.editor().select(["a"])); await page.getByRole("button", { name: "切换只读" }).click();
  await expect(page.getByRole("button", { name: "图形属性", exact: true })).toBeDisabled();
});
