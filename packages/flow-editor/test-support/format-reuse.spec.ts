import { expect, test, type Page } from "@playwright/test";
import "./types";
/** @param page - Private workspace. @returns Completion of distinct-style nodes and two edges. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
    { id: "a", shape: "note", x: 100, y: 100, width: 160, height: 100, text: "源样式", style: { fill: "#ffcc88", stroke: "#aa4400", drawing: "sketch" } },
    { id: "b", shape: "process", x: 400, y: 100, width: 180, height: 100, text: "保留此文字", style: { bold: true, fill: "#00ffff" } },
    { id: "c", shape: "ellipse", x: 400, y: 350, width: 180, height: 100, text: "保留尺寸", style: { fontSize: 24 } },
  ], edges: [
    { id: "e", source: { node: "a" }, target: { node: "b" }, vertices: [], label: "源", labelPosition: 0.5, routing: "straight", connector: "smooth", style: { stroke: "#ee4400", dashed: true, targetArrow: "open" } },
    { id: "f", source: { node: "b" }, target: { node: "c" }, vertices: [{ x: 690, y: 250 }], label: "目标", labelPosition: 0.3, labelOffset: 24, routing: "orthogonal", crossing: "jump", style: {} },
  ] }); e.select(["a"]); e.fit(); });
}
/** @param page - Private workspace. @param name - Explicit session format command. @returns Completion through the public split disclosure. */
async function formatAction(page: Page, name: string): Promise<void> { await page.getByRole("button", { name: "格式复用", exact: true }).click(); await page.getByRole("menuitem", { name, exact: true }).click(); }
test("format copy and multi-paste replace style only, allow read-only copy, and undo once", async ({ page }) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "切换只读" }).click(); await formatAction(page, "复制格式");
  await page.getByRole("button", { name: "允许编辑" }).click(); await page.evaluate(() => window.flowFixture.editor().select(["b", "c"]));
  await formatAction(page, "粘贴格式"); const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after).toEqual({ ...before, nodes: before.nodes.map(n => ({ ...n, style: before.nodes[0]!.style })) });
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["e"]); e.copyFormat(); e.select(["f"]); e.pasteFormat(); });
  const edge = (await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[1]!;
  const { crossing: _crossing, ...old } = before.edges[1]!;
  expect(edge).toEqual({ ...old, style: before.edges[0]!.style, routing: "straight", connector: "smooth" });
});
test("one-shot painter owns the complete pointer gesture and Escape/revocation cancel without edits", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "格式刷", exact: true }).click(); await expect(page.getByRole("button", { name: "取消格式刷", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: info.outputPath("format-painter.png") });
  const box = (await page.locator('.x6-node[data-cell-id="b"] > path').first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30, { steps: 4 }); await page.mouse.up();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes[1]).toEqual({ ...before.nodes[1], style: before.nodes[0]!.style });
  expect((await page.evaluate(() => window.flowFixture.editor().getState())).paintingFormat).toBe(false);
  await page.getByRole("button", { name: "格式刷", exact: true }).click(); await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(after);
  await page.getByRole("button", { name: "格式刷", exact: true }).click(); await page.getByRole("button", { name: "切换只读" }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getState())).paintingFormat).toBe(false);
});
test("incompatible or locked format targets reject without partial updates; IME retains ownership", async ({ page }) => {
  await setup(page);
  expect(await page.evaluate(() => { const e = window.flowFixture.editor(); e.copyFormat(); e.select(["b", "f"]); try { e.pasteFormat(); return "unexpected"; } catch (error) { return String(error); } })).toContain("同类型");
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["b"]); e.execute("lock"); e.select(["a"]); e.setFormatPainter(true); });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.locator('.x6-node[data-cell-id="b"] > path').first().click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before); await expect(page.getByRole("alert")).toContainText("锁定");
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["a"]); e.execute("edit-text"); });
  const input = page.getByRole("textbox", { name: "图形文字" }); await input.dispatchEvent("compositionstart");
  expect(await page.evaluate(() => { try { window.flowFixture.editor().setFormatPainter(true); return "unexpected"; } catch (error) { return String(error); } })).toContain("输入");
  await expect(input).toBeVisible(); await input.dispatchEvent("compositionend"); await input.press("Escape");
});
