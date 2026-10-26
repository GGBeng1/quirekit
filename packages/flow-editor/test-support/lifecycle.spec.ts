import { chooseFlowTemplate } from "./toolbar";
import { expect, test } from "@playwright/test";
import type {} from "./types";

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
});

test("independent instances, read-only selection, late mounts and repeated destruction", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const source = await window.flowFixture.editor().getDocument();
    const host = document.createElement("div"); Object.assign(host.style, { position: "fixed", inset: "0", width: "600px", height: "400px" }); document.body.append(host);
    const other = await window.flowFixture.create({ container: host, document: source, label: "第二编辑区" });
    const original = await window.flowFixture.editor().getDocument();
    const id = other.addNode("ellipse"); other.select([id]); other.execute("delete"); other.execute("undo");
    const secondary = await other.getDocument();
    other.setReadOnly(true); let rejected = false;
    try { other.addNode("process"); } catch { rejected = true; }
    other.destroy(); other.destroy();
    const after = await window.flowFixture.editor().getDocument();
    const abort = new AbortController();
    const pending = window.flowFixture.create({ container: host, document: source, signal: abort.signal }); abort.abort();
    let cancelled = false; try { await pending; } catch { cancelled = true; }
    const mounted = host.childElementCount; host.remove();
    return { original, after, secondaryCount: secondary.nodes.length, rejected, cancelled, mounted };
  });
  expect(result.after).toEqual(result.original); expect(result.secondaryCount).toBe(result.original.nodes.length + 1);
  expect(result.rejected).toBe(true); expect(result.cancelled).toBe(true); expect(result.mounted).toBe(0);
  const node = page.locator('.x6-node[data-cell-id="publish-n1"]'); await node.click();
  await page.getByRole("button", { name: "切换只读" }).click();
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 30); await page.mouse.down(); await page.mouse.move(box.x + 100, box.y + 60, { steps: 5 }); await page.mouse.up();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
});

test("templates, styles, duplicate and edge labels retain one coherent graph history", async ({ page }) => {
  await chooseFlowTemplate(page, "数据处理流程");
  await expect(page.locator(".x6-node")).toHaveCount(4);
  await page.getByRole("button", { name: "撤销", exact: true }).click(); await expect(page.locator(".x6-node")).toHaveCount(6);
  const node = page.locator('.x6-node[data-cell-id="publish-n1"]'); await node.click();
  await page.getByRole("button", { name: "选择填充颜色", exact: true }).click(); await page.getByRole("button", { name: "#C2E5C1", exact: true }).click();
  const styled = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(styled.nodes[1]?.style.fill).toBe("#C2E5C1");
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("ControlOrMeta+D"); await expect(page.locator(".x6-node")).toHaveCount(7);
  await page.getByRole("button", { name: "撤销", exact: true }).click(); await expect(page.locator(".x6-node")).toHaveCount(6);
  await page.evaluate(() => window.flowFixture.editor().select(["publish-e2"]));
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("F2");
  const input = page.getByRole("textbox", { name: "连线文字" }); await input.fill("已批准"); await input.press("ControlOrMeta+Enter");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[2]?.label).toBe("已批准");
  await page.getByRole("button", { name: "连线设置", exact: true }).click(); await page.getByRole("menuitem", { name: "线型", exact: true }).hover(); await page.getByRole("menuitemradio", { name: "虚线", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[2]?.style.dashed).toBe(true);
});

test("SVG coordinates and rendered PNG are independent of viewport and exclude handles", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), first = await editor.exportSvg();
    editor.select(["publish-n1"]); editor.setZoom(0.5);
    const second = await editor.exportSvg();
    const png = await editor.exportPng(), image = new Image(); image.src = png; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) opaque++;
    return { first, second, width: image.width, height: image.height, opaque };
  });
  expect(result.second.source).toBe(result.first.source);
  expect(result.second.width).toBeCloseTo(result.first.width); expect(result.second.height).toBeCloseTo(result.first.height);
  expect(result.second.svg).not.toContain("x6-port"); expect(result.second.svg).not.toContain("x6-cell-tools");
  expect(result.width).toBeGreaterThan(300); expect(result.height).toBeGreaterThan(300);
  expect(result.opaque).toBeGreaterThan(10000);
});

test("manual bend dragging roundtrips and undoes independently of the viewport", async ({ page }) => {
  await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument();
    editor.replaceDocument({ ...source, edges: source.edges.map(e => e.id === "publish-e3"
      ? { ...e, vertices: [{ x: 245, y: 280 }, { x: 225, y: 340 }] } : e) });
    editor.select(["publish-e3"]);
  });
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const handle = page.locator(".x6-edge-tool-vertex").first(); await expect(handle).toBeVisible();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 35, box.y + box.height / 2 - 25, { steps: 5 }); await page.mouse.up();
  const edited = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(edited.edges[3]?.vertices[0]).not.toEqual(source.edges[3]?.vertices[0]);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
});
