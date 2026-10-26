import { expect, test, type Page } from "@playwright/test";
import "./types";

/** @param page - Private browser. Installs three overlapping ordinary nodes and a bent connection. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const editor = window.flowFixture.editor();
    editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
      { id: "a", shape: "process", x: 100, y: 100, width: 160, height: 100, text: "需求", style: {} },
      { id: "b", shape: "process", x: 400, y: 100, width: 160, height: 100, text: "设计", style: {} },
      { id: "c", shape: "process", x: 180, y: 340, width: 160, height: 100, text: "测试", style: {} },
    ], edges: [{ id: "e", source: { node: "a", port: "right" }, target: { node: "b", port: "left" }, vertices: [{ x: 330, y: 240 }],
      routing: "straight", label: "进入", labelPosition: 0.5, style: {} }] });
    editor.select(["a", "b"]); editor.fit();
  });
}
/** @param page - Private browser. @param label - Visible arrange item. */
async function item(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: "排列图形", exact: true }).click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}
/** @param page - Private browser. @param id - Node with a visible body. @param dx - Screen movement. @param dy - Screen movement. */
async function drag(page: Page, id: string, dx: number, dy: number): Promise<void> {
  const box = await page.locator(`.x6-node[data-cell-id="${id}"]`).boundingBox(); expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down(); await page.mouse.move(box!.x + box!.width / 2 + dx, box!.y + box!.height / 2 + dy, { steps: 8 }); await page.mouse.up();
}

test("grouping moves children and internal bends once, ungroup preserves them and history restores ownership", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await item(page, "组合");
  const grouped = await page.evaluate(() => window.flowFixture.editor().getDocument()), group = grouped.nodes.find(n => n.shape === "group")!;
  expect(grouped.nodes.find(n => n.id === "a")!.parent).toBe(group.id);
  await page.evaluate(() => window.flowFixture.editor().select([]));
  await drag(page, "a", 70, 40);
  const moved = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const dx = moved.nodes.find(n => n.id === "a")!.x - before.nodes[0]!.x, dy = moved.nodes.find(n => n.id === "a")!.y - before.nodes[0]!.y;
  expect(dx).toBeGreaterThan(10); expect(dy).toBeGreaterThan(10);
  expect(moved.nodes.find(n => n.id === "b")!.x).toBe(before.nodes[1]!.x + dx);
  expect(moved.edges[0]!.vertices).toEqual([{ x: 330 + dx, y: 240 + dy }]);
  await page.evaluate(id => window.flowFixture.editor().select([id]), group.id);
  await item(page, "取消组合");
  const ungrouped = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(ungrouped.nodes).toHaveLength(3); expect(ungrouped.nodes.every(n => !n.parent)).toBe(true); expect(ungrouped.edges).toEqual(moved.edges);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(moved);
  const snapshot = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  expect(snapshot.svg).not.toContain("qk-flow-hit");
  await page.screenshot({ path: info.outputPath("group.png") });
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(moved.nodes);
});

test("locks stop direct and mixed-selection dragging, formatting and deletion and survive reopening", async ({ page }) => {
  await setup(page); await page.evaluate(() => window.flowFixture.editor().select(["a"]));
  await item(page, "锁定");
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await drag(page, "a", 80, 50);
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.evaluate(() => window.flowFixture.editor().select(["a", "b"]));
  await drag(page, "b", 90, 50);
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.evaluate(() => window.flowFixture.editor().select(["a"]));
  expect(await page.evaluate(() => { try { window.flowFixture.editor().setNodeStyle({ fill: "#ff0000" }); return "edited"; } catch { return "locked"; } })).toBe("locked");
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("Shift+F10");
  await expect(page.getByRole("menuitem", { name: /^删除/ })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.locked).toBe(true);
  await item(page, "全部解锁"); await drag(page, "a", 60, 30);
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.x).not.toBe(before.nodes[0]!.x);
});

test("layer commands update actual SVG paint order and undo restores it", async ({ page }) => {
  await setup(page); await page.evaluate(() => window.flowFixture.editor().select(["a"]));
  await page.getByRole("button", { name: "排列图形", exact: true }).click();
  await page.getByRole("menuitem", { name: "层级", exact: true }).hover();
  await page.getByRole("menuitem", { name: "置于顶层", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.map(n => n.id)).toEqual(["b", "c", "a"]);
  expect(await page.locator(".x6-node").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-cell-id")))).toEqual(["b", "c", "a"]);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.map(n => n.id)).toEqual(["a", "b", "c"]);
});
