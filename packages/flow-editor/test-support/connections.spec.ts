import { expect, test, type Page } from "@playwright/test";
import "./types";

/** @param page - Private page. Installs one labeled horizontal and one crossing vertical edge. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const editor = window.flowFixture.editor();
    editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [], edges: [
      { id: "v", source: { x: 300, y: 80 }, target: { x: 300, y: 400 }, vertices: [], routing: "straight", connector: "sharp", label: "", labelPosition: 0.5, style: { targetArrow: "none" } },
      { id: "h", source: { x: 100, y: 240 }, target: { x: 600, y: 240 }, vertices: [], routing: "straight", connector: "sharp", label: "订单提交", labelPosition: 0.5, style: {} },
    ] }); editor.select(["h"]); editor.fit();
  });
}
/** @param page - Private page. @returns Actual horizontal SVG path. */
async function path(page: Page): Promise<string | null> { return page.locator('.x6-edge[data-cell-id="h"] path[stroke-width]').first().getAttribute("d"); }

test("label dragging preserves distance and offset after formatting, save, reopen and export", async ({ page }) => {
  await setup(page);
  const label = page.locator(".x6-edge-label").filter({ hasText: "订单提交" });
  const box = await label.boundingBox(); expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 90, box!.y + box!.height / 2 + 55, { steps: 8 }); await page.mouse.up();
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument()), edge = before.edges.find(e => e.id === "h")!;
  expect(edge.labelPosition).toBeGreaterThan(0.6); expect(edge.labelOffset).toBeGreaterThan(30);
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["h"]); e.setEdgeStyle({ stroke: "#166534" }); });
  const formatted = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(formatted.edges[1]!.labelOffset).toBe(edge.labelOffset); expect(formatted.edges[1]!.labelPosition).toBe(edge.labelPosition);
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const restored = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(restored.edges).toEqual(formatted.edges);
  const snapshot = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(JSON.parse(snapshot.source).edges).toEqual(formatted.edges);
});

test("crossing previews apply real jump and gap geometry in every drawing style and update after moving the other edge", async ({ page }, info) => {
  await setup(page);
  const original = await path(page);
  await page.getByRole("button", { name: "连线设置", exact: true }).click(); await page.getByRole("menuitem", { name: "交叉处理", exact: true }).hover();
  await page.getByRole("menuitemradio", { name: "跨线弧", exact: true }).click();
  await expect.poll(() => path(page)).not.toBe(original);
  const jumped = await path(page); expect(jumped).toMatch(/C/);
  for (const drawing of ["standard", "sketch", "pencil"] as const) {
    await page.evaluate(drawing => window.flowFixture.editor().setDrawingStyle(drawing), drawing);
    const snapshot = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(snapshot.svg).toContain("C");
    expect(await page.evaluate(() => window.flowFixture.editor().exportPng())).toMatch(/^data:image\/png;base64,/);
  }
  await page.getByRole("button", { name: "连线设置", exact: true }).click(); await page.getByRole("menuitem", { name: "交叉处理", exact: true }).hover();
  await page.getByRole("menuitemradio", { name: "交叉处断开", exact: true }).click();
  const gap = await path(page); expect(gap!.match(/M/g)?.length).toBe(2);
  await page.screenshot({ path: info.outputPath("crossing.png") });
  await page.evaluate(async () => {
    const e = window.flowFixture.editor(), d = await e.getDocument();
    e.replaceDocument({ ...d, edges: d.edges.map(edge => edge.id === "v" ? { ...edge, source: { x: 700, y: 80 }, target: { x: 700, y: 400 } } : edge) });
  });
  const exported = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  expect(exported.svg).not.toContain('M 306'); expect((await path(page))!.match(/M/g)?.length).toBe(1);
});

test("reset bends and label commands are single undoable operations", async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.flowFixture.editor().setEdgeLayout({ vertices: [{ x: 400, y: 300 }], labelPosition: 0.2, labelOffset: -32 }));
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "连线设置", exact: true }).click();
  await page.getByRole("menuitem", { name: "重置折点", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[1]!.vertices).toEqual([]);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "连线设置", exact: true }).click();
  await page.getByRole("menuitem", { name: "重置标签位置", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[1]).toMatchObject({ labelPosition: 0.5, labelOffset: 12 });
});
