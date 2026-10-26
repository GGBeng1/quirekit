import { expect, test, type Page } from "@playwright/test";
import type { FlowchartPlaybackTrace } from "@quirekit/flowchart";
import { observeWork, observedWork } from "./performance/observer";
import "./types";

const trace: FlowchartPlaybackTrace = { title: "依赖运行", steps: [
  { id: "parse", title: "解析新片段", duration: 60000, changes: [{ id: "n0", state: "running" }, { id: "e0", state: "running" }, { id: "n1", state: "pending" }, { id: "n2", state: "reused" }, { id: "e1", state: "invalid" }] },
  { id: "render", title: "更新受影响部分", duration: 60000, changes: [{ id: "n0", state: "completed" }, { id: "n1", state: "running" }, { id: "e0", state: "completed" }, { id: "e1", state: "running" }] },
  { id: "done", title: "完成", changes: [{ id: "n1", state: "completed" }, { id: "e1", state: "completed" }] },
] };
/** @param page - Isolated preview. @returns A settled negative-coordinate, rotated and hand-drawn graph. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
      { id: "n0", shape: "note", x: -150, y: -80, width: 150, height: 90, rotation: 23, flipX: true, text: "解析节点", style: { fill: "#fff8e7", stroke: "#b88945", color: "#6c4721", drawing: "pencil" } },
      { id: "n1", shape: "decision", x: 180, y: -60, width: 160, height: 100, text: "需要更新？", style: { fill: "#eff6ff" } },
      { id: "n2", shape: "database", x: 180, y: 170, width: 160, height: 100, text: "复用块", style: { fill: "#effcf5" } },
    ], edges: [
      { id: "e0", source: { node: "n0", port: "right" }, target: { node: "n1", port: "left" }, vertices: [], routing: "straight", connector: "smooth", label: "继续", labelPosition: 0.5, style: { stroke: "#756589", targetArrow: "open", width: 2 } },
      { id: "e1", source: { node: "n1", port: "bottom" }, target: { node: "n2", port: "top" }, vertices: [{ x: 360, y: 90 }], routing: "orthogonal", label: "复用", labelPosition: 0.5, style: { dashed: true } },
    ] }); e.select(["n0"]); e.fit();
  });
}
/** @param page - Mounted preview. @param frames - Actual browser frames to sample. @returns Running connector phases without sleeps or fake playback state. */
async function phases(page: Page, frames = 8): Promise<(string | null)[]> {
  return page.evaluate(async count => {
    const values: (string | null)[] = [];
    for (let i = 0; i < count; i++) { await new Promise(requestAnimationFrame); values.push(document.querySelector("[data-flow-run-edge=e0]")?.getAttribute("stroke-dashoffset") ?? null); }
    return values;
  }, frames);
}
test("X6 run overlays animate and pause while preserving original paths, source, export and history", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument()), baseline = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  const history = await page.evaluate(() => window.flowFixture.editor().getState()), invalidations = await page.evaluate(() => window.flowFixture.invalidations());
  await observeWork(page); await page.evaluate(value => { const p = window.flowFixture.editor().playback; p.load(value); p.play(); }, trace);
  await expect(page.locator("[data-flow-run-target]")).toHaveCount(5); const moving = await phases(page); expect(new Set(moving).size).toBeGreaterThan(3);
  await page.evaluate(() => window.flowFixture.editor().playback.pause()); expect(new Set(await phases(page)).size).toBe(1);
  expect(await observedWork(page)).toMatchObject({ sourceReads: 0, serializations: 0, searches: 0, paths: {}, overview: [] });
  expect(await page.evaluate(() => window.flowFixture.invalidations())).toBe(invalidations);
  const exported = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(exported).toEqual(baseline); expect(exported.svg).not.toContain("data-flow-run");
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.playback.step(); e.setZoom(0.5); });
  // Compare the actual path in screen space. Browser bounding rectangles differ
  // in their treatment of inherited rect attributes and vector-effect strokes.
  const geometry = await page.evaluate(() => {
    /** @param selector - Actual mounted path. @returns Screen-space samples excluding deliberate outline stroke width. */
    function sample(selector: string) {
      const path = document.querySelector<SVGPathElement>(selector)!, length = path.getTotalLength(), matrix = path.getScreenCTM()!;
      return [0, .2, .4, .6, .8, 1].map(fraction => { const point = path.getPointAtLength(length * fraction).matrixTransform(matrix); return { x: point.x, y: point.y }; });
    }
    return { original: sample('.x6-node[data-cell-id="n0"] path'), overlay: sample('[data-flow-run-target="n0"] > path') };
  });
  for (let i = 0; i < geometry.original.length; i++) for (const key of ["x", "y"] as const) expect(Math.abs(geometry.original[i]![key] - geometry.overlay[i]![key])).toBeLessThan(0.1);
  await page.screenshot({ path: info.outputPath("run-overlay-rotated.png") });
  await page.evaluate(() => window.flowFixture.editor().playback.close()); await expect(page.locator("[data-flow-run-target]")).toHaveCount(0);
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  expect(await page.evaluate(() => window.flowFixture.editor().getState())).toMatchObject({ canUndo: history.canUndo, canRedo: history.canRedo, selectedIds: history.selectedIds, presenting: false });
  await page.evaluate(() => window.flowFixture.editor().execute("undo")); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).not.toEqual(before);
  await page.evaluate(() => window.flowFixture.editor().execute("redo")); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
});
test("authoring APIs and actual mouse/keyboard edits are blocked, navigation and exit remain available", async ({ page }) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.evaluate(value => window.flowFixture.editor().playback.load(value), trace);
  const errors = await page.evaluate(async () => {
    const e = window.flowFixture.editor(), geometry = e.getGeometry(), source = await e.getDocument(); e.copyFormat();
    const actions = [() => e.addNode("process"), () => e.execute("delete"), () => e.execute("undo"), () => e.setColor("fill", "#ffffff"),
      () => e.setNodeStyle({ bold: true }), () => e.setEdgeStyle({ width: 3 }), () => e.setEdgeLayout({ vertices: [] }), () => e.setEdgeConnection({ routing: "straight" }),
      () => e.setDrawingStyle("sketch"), () => e.moveSelection({ x: 1, y: 0 }), () => e.setGeometry({ x: 0 }, geometry), () => e.replaceShape("process", geometry),
      () => e.replaceDocument(source), () => e.insertDocument(source), () => e.addConnectedNode({ direction: "right", shape: "same" }),
      () => e.setTextContent("n0", "changed", []), () => e.pasteFormat(), () => e.setFormatPainter(true)];
    return actions.map(action => { try { action(); return "accepted"; } catch (error) { return String(error); } });
  });
  expect(errors.every(error => error.includes("退出演示"))).toBe(true);
  const box = await page.locator('.x6-node[data-cell-id="n0"]').boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await page.mouse.down(); await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2 + 30, { steps: 10 }); await page.mouse.up();
  await page.evaluate(() => window.flowFixture.editor().focus()); await page.keyboard.press("Delete"); await page.keyboard.press("F2");
  await expect(page.locator("textarea[data-flow-text]")).toHaveCount(0); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.keyboard.press("ArrowRight"); expect(await page.evaluate(() => window.flowFixture.editor().playback.getState().index)).toBe(1);
  await page.keyboard.press("ArrowLeft"); expect(await page.evaluate(() => window.flowFixture.editor().playback.getState().index)).toBe(0);
  await page.keyboard.press("Escape"); await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["n0"]); e.moveSelection({ x: 1, y: 0 }); });
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.x).toBe(before.nodes[0]!.x + 1);
});
test("system reduced motion preserves state and stopping a live run retires its event feed", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await setup(page);
  await page.evaluate(value => { const p = window.flowFixture.editor().playback; p.load(value); p.play(); }, trace);
  expect(new Set(await phases(page))).toEqual(new Set(["0"])); await expect(page.locator('[data-flow-run-target="n0"]')).toHaveAttribute("data-state", "running");
  expect(await page.evaluate(() => window.flowFixture.editor().playback.getState().reducedMotion)).toBe(true);
  await page.screenshot({ path: info.outputPath("run-reduced-motion.png") });
  const live = await page.evaluate(value => {
    const e = window.flowFixture.editor(), feed = e.playback.beginLive("真实事件"); e.playback.pause(); feed.append(value.steps[0]!);
    const queued = e.playback.getState(); e.playback.step(); const applied = e.playback.getState(); e.playback.close();
    return { queued, applied, stale: feed.append(value.steps[1]!), finish: feed.finish() };
  }, trace);
  expect(live.queued).toMatchObject({ status: "paused", index: 0, count: 1 }); expect(live.applied.index).toBe(1); expect(live.stale).toBe(false); expect(live.finish).toBe(false);
});
test("read-only playback isolates another instance and abort releases overlays, clocks and feeds", async ({ page }) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const result = await page.evaluate(async value => {
    const main = window.flowFixture.editor(), container = document.createElement("div"); container.style.cssText = "width:600px;height:360px"; document.body.append(container);
    const abort = new AbortController(), other = await window.flowFixture.create({ container, document: await main.getDocument(), signal: abort.signal, readOnly: true });
    const feed = other.playback.beginLive("isolated"); feed.append(value.steps[0]!); const active = other.playback.getState();
    const isolated = main.playback.getState().active; abort.abort(); other.destroy(); const removed = container.querySelectorAll("[data-flow-run-layer]").length;
    const late = feed.append(value.steps[1]!); container.remove(); return { active, isolated, removed, late };
  }, trace);
  expect(result).toMatchObject({ isolated: false, removed: 0, late: false, active: { status: "playing", index: 1 } });
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
});
