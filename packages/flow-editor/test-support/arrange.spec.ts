import { openFlowAlignment } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import "./types";

/** @param page - Test-owned browser page. @param label - Visible command. */
async function arrange(page: Page, label: string): Promise<void> {
  await openFlowAlignment(page);
  await page.getByRole("button", { name: label, exact: true }).click();
}
test("alignment panel moves rendered shapes, preserves undo and saves dimensions", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const editor = window.flowFixture.editor();
    editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
      { id: "a", shape: "rectangle", x: 0, y: 20, width: 100, height: 60, text: "规划", style: {} },
      { id: "b", shape: "process", x: 260, y: 120, width: 160, height: 100, text: "设计", style: {} },
      { id: "c", shape: "rectangle", x: 700, y: 40, width: 120, height: 80, text: "验证", style: {} },
    ], edges: [] });
    editor.select(["a","b","c"]); editor.fit();
  });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await arrange(page,"顶端对齐");
  const aligned = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(aligned.nodes.map(n => n.y)).toEqual([20,20,20]);
  const tops = await page.locator(".x6-node").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(aligned);
  await arrange(page,"相同尺寸"); await arrange(page,"水平等距分布");
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes.map(n => [n.width,n.height])).toEqual([[160,100],[160,100],[160,100]]);
  const [a,b,c] = after.nodes; expect(b!.x - a!.x).toBe(c!.x - b!.x);
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.screenshot({ path: info.outputPath("arranged.png") });
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(after.nodes);
});

test("container alignment preserves child offsets and both internal and external connectors", async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const editor = window.flowFixture.editor();
    editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
      { id: "p", shape: "container", x: 0, y: 0, width: 300, height: 240, text: "分层", style: {} },
      { id: "a", parent: "p", shape: "process", x: 30, y: 70, width: 80, height: 60, text: "A", style: {} },
      { id: "b", parent: "p", shape: "process", x: 180, y: 70, width: 80, height: 60, text: "B", style: {} },
      { id: "q", shape: "container", x: 400, y: 100, width: 300, height: 240, text: "另一层", style: {} },
    ], edges: [{ id: "e", source: { node: "a" }, target: { node: "b" }, vertices: [{ x: 140,y: 160 }], routing: "straight", label: "关联", labelPosition: 0.5, style: {} }] });
    editor.select(["p","a","q"]); editor.fit();
  });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await openFlowAlignment(page);
  await expect(page.getByRole("button", { name: "相同尺寸", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await arrange(page,"底端对齐");
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes.find(n => n.id === "p")!.y).toBe(100);
  expect(after.nodes.find(n => n.id === "a")!.y).toBe(170);
  expect(after.edges[0]!.vertices).toEqual([{ x: 140,y: 260 }]);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
});

test("alignment actions are directly reachable by keyboard in light and narrow dark layouts", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument();
    editor.select(source.nodes.slice(0, 3).map(node => node.id));
  });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const trigger = page.getByRole("button", { name: "对齐与尺寸", exact: true });
  const panel = page.getByRole("toolbar", { name: "对齐与尺寸", exact: true });
  await trigger.focus(); await trigger.press("ArrowDown");
  await expect(panel).toBeVisible(); await expect(panel.getByRole("button")).toHaveCount(11);
  await expect(panel.getByRole("button", { name: "左对齐", exact: true })).toBeFocused();
  for (let index = 0; index < 3; index++) await page.keyboard.press("ArrowRight");
  await expect(panel.getByRole("button", { name: "顶端对齐", exact: true })).toBeFocused();
  await page.screenshot({ path: info.outputPath("alignment-light.png") });
  await page.keyboard.press("Enter"); await expect(panel).toBeHidden();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes.slice(0, 3).map(node => node.y)).toEqual(Array(3).fill(Math.min(...before.nodes.slice(0, 3).map(node => node.y))));
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await openFlowAlignment(page); await page.keyboard.press("Escape");
  await expect(panel).toBeHidden(); await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 620, height: 820 });
  await page.getByRole("button", { name: "切换明暗主题" }).click();
  await trigger.focus(); await trigger.press("ArrowDown"); await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(620);
  await page.keyboard.press("End"); await expect(panel.getByRole("button", { name: "相同尺寸", exact: true })).toBeFocused();
  await page.screenshot({ path: info.outputPath("alignment-dark-narrow.png") });
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
});

test("alignment popup closes when its selection, source or permission changes", async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const ids = await page.evaluate(async () => (await window.flowFixture.editor().getDocument()).nodes.slice(0, 3).map(node => node.id));
  /** @returns Completion of selecting the original three shapes through the fixture controller. */
  const select = () => page.evaluate(ids => window.flowFixture.editor().select(ids), ids);
  const trigger = page.getByRole("button", { name: "对齐与尺寸", exact: true });
  const panel = page.getByRole("toolbar", { name: "对齐与尺寸", exact: true });
  await expect(trigger).toBeDisabled(); await select(); await openFlowAlignment(page);
  await page.evaluate(ids => window.flowFixture.editor().select(ids.slice(0, 2)), ids); await expect(panel).toBeHidden();
  await openFlowAlignment(page);
  await expect(panel.getByRole("button", { name: "水平等距分布", exact: true })).toBeDisabled();
  await expect(panel.getByRole("button", { name: "等宽", exact: true })).toBeEnabled();
  await page.evaluate(() => window.flowFixture.editor().setNodeStyle({ fill: "#ffeeaa" })); await expect(panel).toBeHidden();
  await openFlowAlignment(page);
  await page.evaluate(() => window.flowFixture.editor().setReadOnly(true)); await expect(panel).toBeHidden(); await expect(trigger).toBeDisabled();
  await page.evaluate(() => window.flowFixture.editor().setReadOnly(false)); await select(); await openFlowAlignment(page);
  await page.evaluate(() => window.flowFixture.editor().execute("lock")); await expect(panel).toBeHidden(); await expect(trigger).toBeDisabled();
});
