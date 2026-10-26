import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import "./types";

/** @param page - Isolated host. Installs real obstacles, an automatic self-loop and a manually routed return. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const editor = window.flowFixture.editor();
    editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
      { id: "a", shape: "process", x: 80, y: 180, width: 120, height: 60, text: "发送请求", style: {} },
      { id: "b", shape: "process", x: 620, y: 180, width: 120, height: 60, text: "处理请求", style: {} },
      { id: "obstacle", shape: "process", x: 340, y: 150, width: 120, height: 120, text: "缓存服务", style: {} },
    ], edges: [
      { id: "forward", source: { node: "a", port: "right" }, target: { node: "b", port: "left" }, vertices: [], routing: "orthogonal", label: "请求", labelPosition: 0.5, style: {} },
      { id: "return", source: { node: "b", port: "top" }, target: { node: "a", port: "top" }, vertices: [{ x: 680, y: 70 }, { x: 140, y: 70 }], routing: "orthogonal", label: "返回结果", labelPosition: 0.5, style: { dashed: true } },
      { id: "self", source: { node: "b" }, target: { node: "b" }, vertices: [], routing: "orthogonal", label: "重试", labelPosition: 0.5, style: {} },
    ] }); editor.fit();
  });
}
/** @param page - Real graph. @param id - Edge ID. @returns World samples and endpoint tangents from the painted SVG path. */
async function samples(page: Page, id: string) {
  return page.locator(`.x6-edge[data-cell-id="${id}"] path[marker-end]`).evaluate(element => {
    const path = element as SVGPathElement, length = path.getTotalLength();
    return { length, points: Array.from({ length: 201 }, (_, i) => { const p = path.getPointAtLength(length * i / 200); return { x: p.x, y: p.y }; }) };
  });
}
test("automatic obstacle avoidance and self-loops keep portable vertices untouched after real drag and reopen", async ({ page }, info) => {
  await setup(page);
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), path = await samples(page, "forward");
  expect(path.points.some(p => p.x > 341 && p.x < 459 && p.y > 151 && p.y < 269)).toBe(false);
  expect(path.points[1]!.x).toBeGreaterThan(path.points[0]!.x);
  expect(path.points.at(-1)!.x).toBeGreaterThan(path.points.at(-2)!.x);
  const loop = await samples(page, "self"); expect(loop.length).toBeGreaterThan(100);
  expect(loop.points.some(p => p.x > 744 || p.y < 176)).toBe(true);
  const obstacle = (await page.locator('.x6-node[data-cell-id="obstacle"]').boundingBox())!;
  await page.mouse.move(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2); await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + i * 25);
  await page.mouse.up();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.edges).toEqual(source.edges);
  const moved = after.nodes.find(n => n.id === "obstacle")!, routed = await samples(page, "forward");
  expect(routed.points.some(p => p.x > moved.x + 1 && p.x < moved.x + moved.width - 1 && p.y > moved.y + 1 && p.y < moved.y + moved.height - 1)).toBe(false);
  const svg = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(JSON.parse(svg.source).edges).toEqual(source.edges);
  await page.screenshot({ path: info.outputPath("routes.png") });
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges).toEqual(source.edges);
  expect((await samples(page, "self")).length).toBeGreaterThan(100);
});
test("explicit return channels are single undoable edits and respect manual route authority", async ({ page }, info) => {
  await setup(page);
  await page.evaluate(() => window.flowFixture.editor().select(["return"]));
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "连线设置", exact: true }).click();
  await page.getByRole("menuitem", { name: "绕行通道", exact: true }).hover();
  await page.getByRole("menuitem", { name: "从下方绕行", exact: true }).click();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.edges.find(e => e.id === "return")!.vertices).toEqual([{ x: 680, y: 288 }, { x: 140, y: 288 }]);
  expect(after.edges.find(e => e.id === "forward")).toEqual(before.edges.find(e => e.id === "forward"));
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(after);
  await page.screenshot({ path: info.outputPath("return-channel.png") });
});
test("coincident ports and mirrored self-loops stay outside the actual port side", async ({ page }) => {
  await setup(page);
  for (const flipX of [false, true]) {
    await page.evaluate(async flipX => {
      const e = window.flowFixture.editor(), d = await e.getDocument();
      e.replaceDocument({ ...d, nodes: d.nodes.map(n => n.id === "b" ? { ...n, flipX } : n), edges: d.edges.map(edge => edge.id === "self" ? { ...edge, source: { node: "b", port: "right" }, target: { node: "b", port: "right" } } : edge) });
    }, flipX);
    const loop = await samples(page, "self"); expect(loop.length).toBeGreaterThan(100);
    expect(loop.points[1]!.x - loop.points[0]!.x).toBeCloseTo(flipX ? -loop.length / 200 : loop.length / 200, 2);
    expect(loop.points.some(p => flipX ? p.x < 615 : p.x > 745)).toBe(true);
    expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges.find(e => e.id === "self")!.vertices).toEqual([]);
  }
});
test("arranging overlapping labels preserves manual bends, exports actual placement and undoes once", async ({ page }, info) => {
  await setup(page);
  await page.evaluate(() => {
    const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [], edges: [
      { id: "one", source: { x: 100, y: 200 }, target: { x: 650, y: 200 }, vertices: [], routing: "straight", label: "异步请求", labelPosition: 0.5, style: {} },
      { id: "two", source: { x: 100, y: 200 }, target: { x: 650, y: 200 }, vertices: [], routing: "straight", label: "确认结果", labelPosition: 0.5, style: { dashed: true } },
      { id: "three", source: { x: 100, y: 200 }, target: { x: 650, y: 200 }, vertices: [], routing: "straight", label: "状态更新", labelPosition: 0.5, style: {} },
    ] }); e.select(["one", "two", "three"]); e.fit();
  });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "连线设置", exact: true }).click(); await page.getByRole("menuitem", { name: "避让标签", exact: true }).click();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.edges.map(e => e.vertices)).toEqual(before.edges.map(e => e.vertices));
  const boxes = await page.locator(".x6-edge-label text").evaluateAll(elements => elements.map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i]!, b = boxes[j]!;
    expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBe(true);
  }
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(after);
  const snapshot = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(JSON.parse(snapshot.source)).toEqual(after);
  await page.evaluate(d => window.flowFixture.editor().replaceDocument(d), after);
  expect((await page.evaluate(() => window.flowFixture.editor().exportSvg())).svg).toContain("异步请求");
  await page.screenshot({ path: info.outputPath("labels.png") });
});
test("default-document connection example contains real source, loop, manual return and PNG", async ({ page }, info) => {
  await setup(page);
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["forward", "return", "self"]); e.execute("edge-label-avoid"); e.select([]); e.fit(); });
  const embed = await page.evaluate(async () => {
    const e = window.flowFixture.editor(), source = await e.getDocument(), dataUrl = await e.exportPng();
    const image = new Image(); image.src = dataUrl; await image.decode();
    return { source, preview: { dataUrl, width: image.width, height: image.height }, title: "避障、回路线与自环" };
  });
  await writeFile(info.outputPath("connections-embed.json"), JSON.stringify(embed));
  await page.screenshot({ path: info.outputPath("connections-showcase.png") });
});
