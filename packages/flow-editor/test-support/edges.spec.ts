import { chooseFlowTemplate } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import type {} from "./types";

/** @param page - Isolated preview. @returns The actual editable sketch template, shown in standard strokes. */
async function openTemplate(page: Page) {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
  await chooseFlowTemplate(page, "手绘 · 从灵感到落地");
  await page.getByRole("button", { name: "绘制风格", exact: true }).click();
  await page.getByRole("menuitem", { name: "标准 · 清晰线条", exact: true }).click();
  return page.evaluate(() => window.flowFixture.editor().getDocument());
}

test("curves follow side ports and transparent labels stay clear of the line in both themes and exports", async ({ page }, info) => {
  const source = await openTemplate(page);
  // These branches are taller than their horizontal gap. Automatic H/V inference
  // used to turn their horizontal port connections into vertical tangents.
  for (const edge of source.edges.slice(0, 4)) {
    const tangents = await page.locator(`.x6-edge[data-cell-id="${edge.id}"] path[marker-end]`).evaluate(element => {
      const path = element as SVGPathElement, length = path.getTotalLength();
      const a = path.getPointAtLength(0), b = path.getPointAtLength(1);
      const c = path.getPointAtLength(length - 1), d = path.getPointAtLength(length);
      return [{ x: b.x - a.x, y: b.y - a.y }, { x: d.x - c.x, y: d.y - c.y }];
    });
    for (const tangent of tangents) { expect(tangent.x).toBeGreaterThan(0.9); expect(Math.abs(tangent.y)).toBeLessThan(0.15); }
  }
  const feedback = page.locator(`.x6-edge[data-cell-id="${source.edges[6]!.id}"]`);
  for (const scheme of ["light", "dark"]) {
    if (scheme === "dark") await page.getByRole("button", { name: "切换明暗主题" }).click();
    const label = feedback.locator(".x6-edge-label");
    expect(await label.locator("rect").evaluate(e => getComputedStyle(e).fill)).toBe("rgba(0, 0, 0, 0)");
    const distance = await feedback.evaluate(element => {
      const path = element.querySelector<SVGPathElement>("path[marker-end]")!;
      const mid = path.getPointAtLength(path.getTotalLength() / 2).matrixTransform(path.getScreenCTM()!);
      const label = element.querySelector(".x6-edge-label text")!.getBoundingClientRect();
      return Math.max(label.top - mid.y, mid.y - label.bottom);
    });
    expect(distance).toBeGreaterThan(2);
    await page.screenshot({ path: info.outputPath(`edge-labels-${scheme}.png`) });
    const exported = await page.evaluate(async () => {
      const editor = window.flowFixture.editor(), svg = await editor.exportSvg(), png = await editor.exportPng();
      const document = new DOMParser().parseFromString(svg.svg, "image/svg+xml");
      const fills = [...document.querySelectorAll(".x6-edge-label rect")].map(e => e.getAttribute("fill"));
      const image = new Image(); image.src = png; await image.decode();
      return { fills, width: image.width, height: image.height };
    });
    expect(exported.fills.length).toBeGreaterThan(0); expect(exported.fills.every(fill => fill === "transparent")).toBe(true);
    expect(exported.width).toBeGreaterThan(500); expect(exported.height).toBeGreaterThan(200);
  }
  // The transparent label body remains a real input target.
  await feedback.locator(".x6-edge-label").dblclick();
  await expect(page.getByRole("textbox", { name: "连线文字" })).toHaveValue("再打磨一下");
  await page.getByRole("textbox", { name: "连线文字" }).press("Escape");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
});

test("theme handles keep vertex dragging and endpoint reconnection editable and undoable", async ({ page }, info) => {
  const source = await openTemplate(page), feedback = source.edges[6]!;
  await page.locator(`.x6-edge[data-cell-id="${feedback.id}"] .x6-edge-label`).click();
  const controls = page.locator(".x6-edge-tool-vertex, .x6-edge-tool-segment, .x6-edge-tool-source-arrowhead, .x6-edge-tool-target-arrowhead");
  const changes = await page.evaluate(() => window.flowFixture.invalidations());
  for (const scheme of ["light", "dark"]) {
    if (scheme === "dark") await page.getByRole("button", { name: "切换明暗主题" }).click();
    await expect(controls).toHaveCount(7);
    const primary = await page.locator(".qk-flow-editor__identity").evaluate(e => getComputedStyle(e).color);
    const appearance = await controls.evaluateAll(elements => elements.map(e => ({ stroke: getComputedStyle(e).stroke, fill: getComputedStyle(e).fill })));
    expect(appearance.every(a => a.stroke === primary && a.fill !== "rgb(51, 51, 51)")).toBe(true);
    const endpoint = await page.locator(".x6-edge-tool-target-arrowhead").evaluate(e => {
      const bounds = (e as SVGGraphicsElement).getBBox(); return { width: bounds.width, height: bounds.height };
    });
    expect(endpoint.width).toBeLessThanOrEqual(12); expect(endpoint.height).toBeLessThanOrEqual(12);
    await page.screenshot({ path: info.outputPath(`edge-handles-${scheme}.png`) });
    expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual([feedback.id]);
  }
  expect(await page.evaluate(() => window.flowFixture.invalidations())).toBe(changes);
  await page.getByRole("button", { name: "切换只读" }).click(); await expect(controls).toHaveCount(0);
  await page.getByRole("button", { name: "允许编辑" }).click(); await expect(controls).toHaveCount(7);
  const handle = page.locator(".x6-edge-tool-vertex").first(), bounds = (await handle.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 35, bounds.y + bounds.height / 2 - 25, { steps: 5 }); await page.mouse.up();
  const moved = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(moved.edges[6]!.vertices).not.toEqual(feedback.vertices); expect(moved.edges[6]!.target).toEqual(feedback.target);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  const endpoint = (await page.locator(".x6-edge-tool-target-arrowhead").boundingBox())!;
  const targetNode = page.locator(`.x6-node[data-cell-id="${source.nodes[2]!.id}"]`);
  await targetNode.hover();
  const port = (await targetNode.locator('[port="top"]').boundingBox())!;
  await page.mouse.move(endpoint.x + endpoint.width / 2, endpoint.y + endpoint.height / 2); await page.mouse.down();
  await page.mouse.move(port.x + port.width / 2, port.y + port.height / 2, { steps: 10 }); await page.mouse.up();
  const reconnected = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(reconnected.edges[6]!.target).toEqual({ node: source.nodes[2]!.id, port: "top" });
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
});
