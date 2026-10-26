import { expect, test, type Page } from "@playwright/test";
import "./types";
/** @param page - Private canvas. @returns Completion of the styled source fixture. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
    { id: "idea", shape: "note", x: 100, y: 100, width: 160, height: 100, text: "一个想法", style: { fill: "#fff8e7", stroke: "#b88945", drawing: "pencil" } },
  ], edges: [] }); e.select(["idea"]); e.fit(); });
}
test("insertion menu adds a connected shape and chooses direction and type in one undo step", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "插入与结构", exact: true }).click(); await page.getByRole("menuitem", { name: "向右添加相同图形", exact: true }).click();
  const first = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(first.nodes).toHaveLength(2); expect(first.edges).toHaveLength(1); expect(first.nodes[1]!.style).toEqual(first.nodes[0]!.style);
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual([first.nodes[1]!.id]);
  await page.keyboard.press("F2"); await page.getByRole("textbox", { name: "图形文字" }).fill("验证方案"); await page.keyboard.press("ControlOrMeta+Enter");
  const saved = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "插入与结构", exact: true }).click(); await page.getByRole("menuitem", { name: "选择方向与图形", exact: true }).hover(); await page.getByRole("menuitem", { name: "向下添加", exact: true }).hover(); await page.getByRole("menuitem", { name: "判断", exact: true }).click();
  const created = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(created.nodes[2]!.shape).toBe("decision"); expect(created.nodes[2]!.y).toBeGreaterThan(created.nodes[1]!.y + created.nodes[1]!.height);
  await page.screenshot({ path: info.outputPath("connected-pencil.png") });
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(saved);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  const svg = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(JSON.parse(svg.source).nodes).toEqual(created.nodes); expect(svg.svg).not.toMatch(/NaN|Infinity/);
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload(); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges).toEqual(created.edges); expect(before.nodes).toHaveLength(1);
});
test("context creation and refusal keep ownership and never partially insert", async ({ page }) => {
  await setup(page); await page.evaluate(() => window.flowFixture.editor().focus()); await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "添加相连图形", exact: true }).hover(); await page.getByRole("menuitem", { name: "向左添加", exact: true }).hover(); await page.getByRole("menuitem", { name: "数据库", exact: true }).click();
  const created = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(created.nodes[1]!.shape).toBe("database"); expect(created.nodes[1]!.x).toBeLessThan(created.nodes[0]!.x);
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.execute("lock"); });
  await page.getByRole("button", { name: "插入与结构", exact: true }).click(); await expect(page.getByRole("menuitem", { name: "向右添加相同图形", exact: true })).toHaveAttribute("aria-disabled", "true"); await page.keyboard.press("Escape");
  const failure = await page.evaluate(async () => { const e = window.flowFixture.editor(), before = await e.getDocument(); let error = ""; try { e.addConnectedNode({ direction: "right", shape: "same" }); } catch (reason) { error = String(reason); } return { error, same: JSON.stringify(before) === JSON.stringify(await e.getDocument()) }; });
  expect(failure).toMatchObject({ same: true }); expect(failure.error).toContain("锁定");
});
