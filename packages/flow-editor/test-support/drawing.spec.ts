import { chooseFlowTemplate, openFlowLine, flowLineSection } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

/** @param page - Preview tab. @param menu - Toolbar label. @param item - Exact menu choice. @returns Completed menu selection. */
async function choose(page: Page, menu: string, item: string): Promise<void> {
  if (menu === "快捷模板") return chooseFlowTemplate(page, item);
  if (menu === "连线样式" || menu === "连线箭头") await openFlowLine(page, flowLineSection(item));
  else await page.getByRole("button", { name: menu === "导出" ? "图表" : menu, exact: true }).click();
  await page.getByRole(menu === "连线样式" || menu === "连线箭头" ? "menuitemradio" : "menuitem", { name: item, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
});

test("all palette shapes are real editable source with inherited drawing tools", async ({ page }, info) => {
  await choose(page, "快捷模板", "空白流程图"); await choose(page, "绘制风格", "铅笔 · 手绘排线");
  const palette = page.getByRole("complementary", { name: "图形库" });
  const buttons = palette.getByRole("button", { name: /^插入/ }); expect(await buttons.count()).toBe(52);
  for (let i = 0; i < 52; i++) await buttons.nth(i).click();
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(new Set(source.nodes.map(n => n.shape)).size).toBe(52);
  expect(source.nodes.every(n => n.style.drawing === "pencil")).toBe(true);
  // Arrange the actual inserted objects for visual geometry inspection before
  // continuing their native editing and persistence lifecycle.
  await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), document = await editor.getDocument();
    editor.replaceDocument({ ...document, nodes: document.nodes.map((n, i) => ({ ...n, x: i % 8 * 210, y: Math.floor(i / 8) * 180 })) }); editor.fit();
  });
  await page.screenshot({ animations: "disabled", path: info.outputPath("shape-gallery.png") });
  // Check actual SVG contour geometry: the semantic connection point must sit
  // on the precise hit outline, independent of the pencil decoration.
  await page.evaluate(() => { const editor = window.flowFixture.editor(); editor.select([]); editor.setDrawingStyle("standard"); });
  const attachments = await page.evaluate(async () => {
    const source = await window.flowFixture.editor().getDocument();
    return Array.from(document.querySelectorAll<SVGGElement>(".qk-flow-editor__surface .x6-node")).flatMap(node => {
    const body = node.querySelector<SVGPathElement>("path")!;
    const detail = node.querySelectorAll<SVGPathElement>(":scope > path")[3]!;
    const open = ["bracket-left", "bracket-right", "brace"].includes(source.nodes.find(n => n.id === node.dataset.cellId)!.shape);
    const paths = open ? [detail] : [body, detail];
    return Array.from(node.querySelectorAll<SVGCircleElement>("circle[port]")).map(port => {
      const matrix = body.getCTM()!.inverse().multiply(port.getCTM()!);
      let distance = Infinity;
      for (const path of paths) {
        if (!path.getAttribute("d")) continue;
        const length = path.getTotalLength();
        for (let at = 0; at <= length; at += 0.25) {
          const point = path.getPointAtLength(at); distance = Math.min(distance, Math.hypot(point.x - matrix.e, point.y - matrix.f));
        }
      }
      return { id: node.dataset.cellId, port: port.getAttribute("port"), distance };
    });
  }); });
  expect(attachments).toHaveLength(208);
  expect(attachments.filter(item => item.distance > 0.5)).toEqual([]);
  await page.evaluate(() => window.flowFixture.editor().setDrawingStyle("pencil"));
  const exported = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), snapshot = await editor.exportSvg(), png = await editor.exportPng();
    const svg = new DOMParser().parseFromString(snapshot.svg, "image/svg+xml"), image = new Image();
    image.src = png; await image.decode();
    return { svg: snapshot.svg, png, errors: svg.querySelectorAll("parsererror").length,
      nodes: svg.querySelectorAll(".x6-node").length, width: image.width, height: image.height };
  });
  expect(exported.errors).toBe(0); expect(exported.nodes).toBe(52);
  expect(exported.width).toBeGreaterThan(1000); expect(exported.height).toBeGreaterThan(500);
  await writeFile(info.outputPath("shape-library.svg"), exported.svg);
  await writeFile(info.outputPath("shape-library.png"), Buffer.from(exported.png.split(",")[1]!, "base64"));
  await page.evaluate(id => window.flowFixture.editor().select([id]), source.nodes[39]!.id);
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("F2");
  await page.getByRole("textbox", { name: "图形文字" }).fill("新增图形 🖊");
  await page.getByRole("textbox", { name: "图形文字" }).press("ControlOrMeta+Enter");
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
  const restored = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(restored.nodes).toHaveLength(52); expect(restored.nodes[39]?.text).toBe("新增图形 🖊");
  expect(restored.nodes.every(n => n.style.drawing === "pencil")).toBe(true);
});

test("connection geometry and markers retain bends and form atomic undo entries", async ({ page }) => {
  await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument();
    editor.replaceDocument({ ...source, edges: source.edges.map((e, i) => i ? e : { ...e, vertices: [{ x: 600, y: 125 }] }) });
    editor.select([source.edges[0]!.id]);
  });
  const base = await page.evaluate(() => window.flowFixture.editor().getDocument());
  for (const [label, routing, connector] of [["直线", "straight", "sharp"], ["直角折线", "orthogonal", "sharp"], ["圆角折线", "orthogonal", "rounded"], ["平滑曲线", "straight", "smooth"]]) {
    await choose(page, "连线样式", label!);
    const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
    expect(after.edges[0]).toMatchObject({ routing, connector, vertices: base.edges[0]!.vertices });
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(base);
  }
  for (const [label, targetArrow] of [["单向箭头", "block"], ["双向箭头", "block"], ["开放箭头", "open"], ["菱形端点", "diamond"], ["圆形端点", "circle"], ["无箭头", "none"]]) {
    await choose(page, "连线箭头", label!);
    expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[0]?.style).toMatchObject({ targetArrow, sourceArrow: label === "双向箭头" ? "block" : "none" });
  }
  await choose(page, "连线样式", "粗线 · 3 px"); await choose(page, "绘制风格", "轻手绘 · 自然笔触");
  const styled = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(styled.edges[0]?.style).toMatchObject({ width: 3, drawing: "sketch" });
  expect(styled.edges[1]?.style.drawing).toBeUndefined();
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges).toEqual(styled.edges);
});

test("sketch snapshots stay deterministic through zoom, theme and source reload with readable labels", async ({ page }, info) => {
  await choose(page, "快捷模板", "手绘 · 从灵感到落地");
  const before = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument(), snapshot = await editor.exportSvg();
    const paths = Array.from(document.querySelectorAll(".x6-node > path, .x6-edge > path")).map(p => p.getAttribute("d"));
    return { source, snapshot, paths };
  });
  for (const cell of await page.locator(".x6-node").all()) {
    const box = (await cell.boundingBox())!, label = (await cell.locator("text").boundingBox())!;
    expect(label.x).toBeGreaterThan(box.x); expect(label.x + label.width).toBeLessThan(box.x + box.width);
    expect(label.y).toBeGreaterThan(box.y); expect(label.y + label.height).toBeLessThan(box.y + box.height);
  }
  await page.screenshot({ animations: "disabled", path: info.outputPath("pencil-light.png") });
  await page.getByRole("button", { name: "切换明暗主题" }).click();
  expect(await page.evaluate(() => Array.from(document.querySelectorAll(".x6-node > path, .x6-edge > path")).map(p => p.getAttribute("d")))).toEqual(before.paths);
  await page.screenshot({ animations: "disabled", path: info.outputPath("pencil-dark.png") });
  await page.getByRole("button", { name: "切换明暗主题" }).click();
  const result = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument();
    editor.setZoom(0.5); const zoomed = await editor.exportSvg(); editor.replaceDocument(source); const reopened = await editor.exportSvg();
    const png = await editor.exportPng(), image = new Image(); image.src = png; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0); const rgba = context.getImageData(0, 0, image.width, image.height).data;
    let visible = 0; for (let i = 3; i < rgba.length; i += 4) if (rgba[i]) visible++;
    return { zoomed, reopened, visible };
  });
  expect(result.zoomed.source).toBe(before.snapshot.source); expect(result.reopened.source).toBe(before.snapshot.source);
  // Vendor-generated marker identifiers may change after replacement; compare actual vector content.
  /** @param svg - Exported asset. @returns Geometry independent of vendor marker identities. */
  const vectorPaths = (svg: string) => [...svg.matchAll(/\bd="([^"]*)"/g)].map(m => m[1]).sort();
  expect(vectorPaths(result.zoomed.svg)).toEqual(vectorPaths(before.snapshot.svg));
  expect(vectorPaths(result.reopened.svg)).toEqual(vectorPaths(before.snapshot.svg));
  expect(result.reopened.svg).not.toContain("qk-flow-hit"); expect(result.reopened.svg).not.toContain("x6-port");
  expect(result.visible).toBeGreaterThan(40000);
  const download = page.waitForEvent("download"); await choose(page, "导出", "导出矢量图（SVG）…");
  await page.getByRole("button", { name: "下载图片", exact: true }).click();
  await (await download).saveAs(info.outputPath("pencil.svg"));
  const pngDownload = page.waitForEvent("download"); await choose(page, "导出", "导出图片（PNG）…");
  await page.getByRole("button", { name: "下载图片", exact: true }).click();
  await (await pngDownload).saveAs(info.outputPath("pencil.png"));
  await page.setViewportSize({ width: 740, height: 820 }); await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.screenshot({ animations: "disabled", path: info.outputPath("pencil-narrow.png") });
});

test("pencil shapes drag through hatch gaps and connected strokes follow without full source reads", async ({ page }) => {
  await choose(page, "绘制风格", "铅笔 · 手绘排线");
  const before = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(); editor.select(["publish-n1"]);
    const source = await editor.getDocument(), read = editor.getDocument.bind(editor), style = editor.getState().selectedStyle;
    let count = 0; editor.getDocument = async () => { count++; return read(); };
    Object.assign(window, { drawingReadCount: () => count, drawingStyleStable: () => editor.getState().selectedStyle === style });
    return { source, edge: document.querySelector('.x6-edge[data-cell-id="publish-e0"] > path:last-of-type')!.getAttribute("d") };
  });
  const node = page.locator('.x6-node[data-cell-id="publish-n1"]'), box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 31, box.y + 23); await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(box.x + 31 + i * 12, box.y + 23 + i * 6);
  await page.mouse.up();
  expect(await page.evaluate(() => (window as unknown as { drawingReadCount(): number }).drawingReadCount())).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { drawingStyleStable(): boolean }).drawingStyleStable())).toBe(true);
  expect(await page.locator('.x6-edge[data-cell-id="publish-e0"] > path:last-of-type').getAttribute("d")).not.toBe(before.edge);
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes[1]!.x).not.toBe(before.source.nodes[1]!.x);
  expect(after.edges[0]!.target).toEqual(before.source.edges[0]!.target);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before.source);
  await page.getByRole("button", { name: "切换只读" }).click();
  await expect(page.getByRole("button", { name: "绘制风格", exact: true })).toBeDisabled();
});

test("resizing pencil geometry refreshes its outline and ports and undoes as one gesture", async ({ page }) => {
  await choose(page, "绘制风格", "铅笔 · 手绘排线");
  const node = page.locator('.x6-node[data-cell-id="publish-n1"]'); await node.click();
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const outline = await node.locator("path").nth(2).getAttribute("d");
  const port = node.locator('[port="right"]'); const beforePort = (await port.boundingBox())!;
  const grip = page.locator('.x6-widget-transform-resize[data-position="bottom-right"]'); await expect(grip).toBeVisible();
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 48, box.y + box.height / 2 + 24, { steps: 5 }); await page.mouse.up();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes[1]!.width).toBeGreaterThan(before.nodes[1]!.width);
  expect(await node.locator("path").nth(2).getAttribute("d")).not.toBe(outline);
  expect((await port.boundingBox())!.x).toBeGreaterThan(beforePort.x);
  expect(after.edges.map(e => e.target)).toEqual(before.edges.map(e => e.target));
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  expect(await node.locator("path").nth(2).getAttribute("d")).toBe(outline);
});
