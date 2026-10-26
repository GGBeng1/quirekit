import { expect, test, type Page } from "@playwright/test";
import "./types";
/** @param page - Private workspace. @returns A negative-coordinate diagram with structured text and a distant node. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
    { id: "a", shape: "process", x: -240, y: -120, width: 160, height: 100, text: "订单审批", style: {} },
    { id: "b", shape: "er-entity", x: 300, y: 300, width: 220, height: 150, text: "Account", entity: { fields: [{ name: "customer_id", type: "UUID", key: "primary" }] }, style: {} },
    { id: "c", shape: "uml-class", x: 5000, y: 2000, width: 200, height: 150, text: "Order", uml: { attributes: ["+ id: UUID"], operations: ["+ submit(): void"] }, style: {} },
    { id: "d", shape: "note", x: 0, y: 100, width: 160, height: 100, rotation: 90, text: "补充资料", style: {} },
  ], edges: [{ id: "edge", source: { node: "a" }, target: { node: "b" }, vertices: [{ x: 800, y: -200 }], routing: "straight", label: "", labelPosition: 0.5, style: {} }] }); e.fit(); });
}
test("literal search locates titles and structured members; updates once, remains usable readonly and preserves history", async ({ page }) => {
  await setup(page); const before = await page.evaluate(async () => ({ source: await window.flowFixture.editor().getDocument(), state: window.flowFixture.editor().getState() }));
  await page.getByRole("button", { name: "查找图形", exact: true }).click(); const query = page.getByRole("textbox", { name: "查找画布文字" }); await expect(query).toBeFocused();
  await query.fill("CUSTOMER"); await expect(page.getByRole("region", { name: "查找图形" })).toContainText("找到 1 个图形");
  await page.getByRole("button", { name: "定位：Account", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["b"]);
  await query.fill("submit("); await query.press("Enter"); expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["c"]);
  const canvas = (await page.getByRole("application", { name: "流程图编辑区" }).boundingBox())!, node = (await page.locator('.x6-node[data-cell-id="c"]').boundingBox())!;
  expect(node.x).toBeGreaterThan(canvas.x); expect(node.x + node.width).toBeLessThan(canvas.x + canvas.width);
  await query.fill(".*"); await expect(page.getByRole("region", { name: "查找图形" })).toContainText("找到 0 个图形");
  await page.getByRole("button", { name: "切换只读" }).click(); await query.fill("订单"); await query.press("Enter");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before.source);
  expect((await page.evaluate(() => window.flowFixture.editor().getState())).canUndo).toBe(before.state.canUndo);
  await page.getByRole("button", { name: "适应选区", exact: true }).click(); await page.getByRole("button", { name: "允许编辑" }).click();
  await page.evaluate(() => window.flowFixture.editor().setNodeContent("a", { text: "已经完成" }));
  await expect(page.getByRole("region", { name: "查找图形" })).toContainText("找到 0 个图形");
  await query.fill("已经"); await expect(page.getByRole("button", { name: "定位：已经完成" })).toBeVisible();
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["a"]); e.execute("delete"); });
  await expect(page.getByRole("region", { name: "查找图形" })).toContainText("找到 0 个图形");
  await query.press("Escape"); await expect(query).toBeHidden(); await expect(page.getByRole("application", { name: "流程图编辑区" })).toBeFocused();
});
test("overview uses world coordinates through zoom, rotation and letterboxing; click and keyboard navigation are content-free", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "画布缩略图", exact: true }).click(); await expect(page.locator("[data-overview-node]")).toHaveCount(4);
  await expect(page.locator('[data-overview-node="d"]')).toHaveAttribute("width", "100");
  const mini = page.getByRole("button", { name: "缩略图定位画布，方向键平移，回车居中" });
  const p = await mini.evaluate(svg => {
    const matrix = (svg as SVGSVGElement).getScreenCTM()!, point = new DOMPoint(410, 375).matrixTransform(matrix);
    const x = Math.round(point.x), y = Math.round(point.y), world = new DOMPoint(x, y).matrixTransform(matrix.inverse());
    return { x, y, worldX: world.x, worldY: world.y };
  });
  await page.mouse.click(p.x, p.y);
  const center = await page.evaluate(() => { const s = window.flowFixture.editor().getState(), el = document.querySelector<HTMLElement>("[data-quirekit-flowchart]")!; return { x: (el.clientWidth / 2 - s.x) / s.scale, y: (el.clientHeight / 2 - s.y) / s.scale }; });
  expect(center.x).toBeCloseTo(p.worldX, 1); expect(center.y).toBeCloseTo(p.worldY, 1);
  const x = Number(await page.locator("[data-overview-viewport]").getAttribute("x")); await mini.press("ArrowRight");
  expect(Number(await page.locator("[data-overview-viewport]").getAttribute("x"))).toBeGreaterThan(x);
  await mini.press("Enter"); await page.getByRole("button", { name: "放大", exact: true }).click();
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["a", "d"]); e.fitSelection(); });
  await page.screenshot({ path: info.outputPath("navigation-light.png"), animations: "disabled" });
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "查找图形", exact: true }).click(); await page.getByRole("textbox", { name: "查找画布文字" }).fill("资料");
  await page.getByRole("button", { name: "切换明暗主题" }).click(); await page.setViewportSize({ width: 800, height: 820 });
  await page.screenshot({ path: info.outputPath("navigation-dark-narrow.png"), animations: "disabled" });
  await page.getByRole("button", { name: "关闭缩略图" }).click(); await expect(page.locator("[data-overview-node]")).toHaveCount(0);
});
test("navigation rejects stale IDs and composition; empty/replaced graphs and external observer cleanup are safe", async ({ page }) => {
  await setup(page);
  const check = await page.evaluate(async () => {
    const source = await window.flowFixture.editor().getDocument(), host = document.createElement("div"), overview = document.createElement("div"); document.body.append(host, overview);
    const e = await window.flowFixture.create({ container: host, document: source }); e.mountOverview(overview); let updates = 0; e.subscribeSearch(() => updates++);
    e.replaceDocument({ ...source, nodes: [], edges: [] }); const empty = overview.querySelectorAll("[data-overview-node]").length;
    e.replaceDocument(source); const restored = overview.querySelectorAll("[data-overview-node]").length;
    let stale = ""; try { e.locateNode("missing"); } catch (reason) { stale = String(reason); }
    e.destroy(); const remaining = overview.childElementCount; host.remove(); overview.remove();
    return { empty, restored, updates, stale, remaining };
  });
  expect(check).toMatchObject({ empty: 0, restored: 4, updates: 2, remaining: 0 }); expect(check.stale).toContain("不存在");
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["a"]); e.execute("edit-text"); });
  const input = page.getByRole("textbox", { name: "图形文字" }); await input.dispatchEvent("compositionstart");
  expect(await page.evaluate(() => { try { window.flowFixture.editor().locateNode("b"); return "unexpected"; } catch (reason) { return String(reason); } })).toContain("输入");
  await expect(input).toBeVisible(); await input.dispatchEvent("compositionend"); await input.press("Escape");
});
