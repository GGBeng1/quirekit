import { expect, test, type Page } from "@playwright/test";
import "./types";

/** @param page - Private context. Installs two differently formatted rectangles. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const editor = window.flowFixture.editor();
    editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
      { id: "a", shape: "rectangle", x: 0, y: 0, width: 260, height: 160, text: "文字排版\n第二行", style: { fontSize: 14, fill: "#eff6ff" } },
      { id: "b", shape: "note", x: 340, y: 0, width: 260, height: 160, text: "方案说明", style: { fontSize: 24, fill: "#fffbeb" } },
    ], edges: [] }); editor.select(["a", "b"]); editor.fit();
  });
}

test("typography panel applies arbitrary size, alignments and padding atomically with source-bound export", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "文字样式", exact: true }).click();
  const panel = page.getByRole("form", { name: "图形文字属性" });
  const size = panel.getByRole("spinbutton", { name: "字号（px）" });
  await expect(size).toHaveValue("");
  await size.fill("19.5"); await panel.getByRole("spinbutton", { name: "内边距（px）" }).fill("10");
  await panel.getByRole("button", { name: "左对齐", exact: true }).click();
  await panel.getByRole("button", { name: "顶端", exact: true }).click();
  await panel.getByRole("button", { name: "加粗", exact: true }).click();
  await expect(panel.getByRole("button", { name: "左对齐", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByRole("button", { name: "居中", exact: true })).toHaveAttribute("aria-pressed", "false");
  const panelBounds = await panel.boundingBox(), applyBounds = await panel.getByRole("button", { name: "应用文字样式" }).boundingBox();
  expect(applyBounds!.x + applyBounds!.width).toBeLessThanOrEqual(panelBounds!.x + panelBounds!.width + 1);
  await page.screenshot({ path: info.outputPath("typography-panel.png") });
  await panel.getByRole("button", { name: "应用文字样式" }).click();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  for (const n of after.nodes) expect(n.style).toMatchObject({ fontSize: 19.5, padding: 10, textAlign: "left", verticalAlign: "top", bold: true });
  const text = page.locator('.x6-node[data-cell-id="a"] text');
  await expect(text).toHaveAttribute("text-anchor", "start"); await expect(text).toHaveAttribute("font-size", "19.5");
  await expect(text).toHaveAttribute("x", "22");
  // WebKit's protocol bounding box omits SVG text x/y. Measure both elements
  // through the browser's native layout in the same read, matching painted ink.
  const { nodeBox, textBox } = await page.locator('.x6-node[data-cell-id="a"]').evaluate(node => ({
    nodeBox: node.querySelector("path")!.getBoundingClientRect().toJSON(),
    textBox: node.querySelector("text")!.getBoundingClientRect().toJSON(),
  }));
  // Glyph ink includes font side bearings beyond the exact 22px SVG anchor.
  expect(textBox.x - nodeBox.x).toBeGreaterThanOrEqual(22); expect(textBox.x - nodeBox.x).toBeLessThan(28); expect(textBox.y - nodeBox.y).toBeGreaterThanOrEqual(12);
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(after);
  const svg = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(JSON.parse(svg.source).nodes).toEqual(after.nodes); expect(svg.svg).toContain('text-anchor="start"');
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload(); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(after.nodes);
});

test("cancel and selection changes discard typography drafts and unchanged mixed fields stay mixed", async ({ page }) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "文字样式", exact: true }).click();
  const panel = page.getByRole("form", { name: "图形文字属性" });
  await panel.getByRole("spinbutton", { name: "字号（px）" }).fill("40"); await panel.getByRole("button", { name: "取消", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "文字样式", exact: true }).click();
  await expect(panel.getByRole("spinbutton", { name: "字号（px）" })).toHaveValue("");
  await panel.getByRole("button", { name: "右对齐", exact: true }).click(); await panel.getByRole("button", { name: "应用文字样式" }).click();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(after.nodes.map(n => n.style.fontSize)).toEqual([14, 24]);
  await page.getByRole("button", { name: "文字样式", exact: true }).click(); await panel.getByRole("spinbutton", { name: "字号（px）" }).fill("40");
  await page.evaluate(() => window.flowFixture.editor().select(["a"])); await expect(panel).toBeHidden();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(after);
  await page.evaluate(() => window.flowFixture.editor().execute("edit-text"));
  await expect(page.getByRole("textbox", { name: "图形文字" })).toHaveCSS("text-align", "right");
  await page.getByRole("textbox", { name: "图形文字" }).fill("中文排版\n输入验证"); await page.keyboard.press("Control+Enter");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.text).toBe("中文排版\n输入验证");
});
