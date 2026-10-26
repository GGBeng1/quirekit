import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import type { FlowchartDocument, FlowchartPlaybackTrace } from "@quirekit/flowchart";
import { mountSmartGraph } from "./performance/fixture";
import { observeWork, observedWork } from "./performance/observer";
import "./types";

test("attention objects travel in parallel, reveal the matrix and preserve static exports and history", async ({ page }, info) => {
  await page.goto("/"); await page.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "演示模式…", exact: true }).click();
  const original = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.evaluate(() => window.flowFixture.loadExample("attention"));
  await page.evaluate(() => window.flowFixture.editor().playback.seek(0));
  const earlyEdges = await page.locator(".x6-edge").evaluateAll(nodes => nodes.map(node => node.getAttribute("opacity"))); expect(new Set(earlyEdges)).toEqual(new Set(["0"]));
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), svg = await page.evaluate(() => window.flowFixture.editor().exportSvg()), png = await page.evaluate(() => window.flowFixture.editor().exportPng());
  expect(svg.svg).not.toContain("data-flow-authored-opacity"); expect(svg.svg).not.toContain("data-flow-motion");
  await page.evaluate(() => { const p = window.flowFixture.editor().playback; p.seek(2); p.seekProgress(.3); });
  await expect(page.locator("[data-flow-motion-travel]")).toHaveCount(9); await expect(page.locator("[data-flow-run-target]")).toHaveCount(0);
  const phases = await page.evaluate(async () => {
    const e = window.flowFixture.editor(); e.playback.play(); const values = [];
    for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); values.push(Array.from(document.querySelectorAll("[data-flow-motion-travel] > g")).map(node => node.getAttribute("transform"))); }
    e.playback.pause(); return values;
  });
  for (let i = 0; i < 9; i++) expect(new Set(phases.map(frame => frame[i])).size).toBeGreaterThan(5);
  await page.getByRole("slider", { name: "步骤内预览", exact: true }).press("Home"); expect(await page.evaluate(() => window.flowFixture.editor().playback.getProgress())).toBe(0);
  await page.evaluate(() => window.flowFixture.editor().playback.seekProgress(.5));
  await page.screenshot({ path: info.outputPath("qkv-parallel.png") });
  const paused = await page.evaluate(async () => { const values = []; for (let i = 0; i < 5; i++) { await new Promise(requestAnimationFrame); values.push(document.querySelector("[data-flow-motion-travel] > g")!.getAttribute("transform")); } return values; });
  expect(new Set(paused).size).toBe(1);
  expect(await page.evaluate(() => window.flowFixture.editor().exportSvg())).toEqual(svg); expect(await page.evaluate(() => window.flowFixture.editor().exportPng())).toBe(png);
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  await page.evaluate(() => { const p = window.flowFixture.editor().playback; p.seek(3); p.seekProgress(.65); });
  await expect(page.locator('.x6-node[data-cell-id$="-weight-0-0"]')).toHaveAttribute("opacity", "1");
  await expect(page.locator('.x6-node[data-cell-id$="-weight-2-2"]')).not.toHaveAttribute("opacity", "1");
  await page.evaluate(() => { const p = window.flowFixture.editor().playback; p.seek(3); p.seekProgress(1); });
  await expect(page.locator('.x6-node[data-cell-id$="-weight-1-0"] text')).toHaveText("0.35");
  await expect(page.locator('.x6-node[data-cell-id$="-weight-0-0"] text')).toHaveText("1.00");
  await page.getByRole("button", { name: "退出演示", exact: true }).click(); await expect(page.locator("[data-flow-authored-opacity]")).toHaveCount(0);
  expect(await page.evaluate(() => window.flowFixture.editor().exportSvg())).toEqual(svg); expect(await page.evaluate(() => window.flowFixture.editor().exportPng())).toBe(png);
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(original);
  await exportShowcase(page, info.outputPath("attention-sample.json"), "attention");
});

test("cached travel follows a real curve and reverse direction, reduced motion resolves visibility", async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled(); await mountSmartGraph(page, 100);
  const trace: FlowchartPlaybackTrace = { title: "curve", hidden: ["n3"], presentation: "motion", steps: [{ id: "one", title: "move", duration: 60000, changes: [], effects: [
    { id: "e0", kind: "travel", payload: "token", label: "data", direction: "reverse" }, { id: "n3", kind: "appear", delay: 10000, duration: 30000 },
  ] }] };
  await page.evaluate(value => { const p = window.flowFixture.editor().playback; p.load(value); p.play(); p.seekProgress(.25); }, trace);
  const geometry = await page.evaluate(() => {
    const path = document.querySelector<SVGPathElement>('.x6-edge[data-cell-id="e0"] [marker-end]')!, point = path.getPointAtLength(path.getTotalLength() * .75).matrixTransform(path.getScreenCTM()!);
    const actor = document.querySelector<SVGGElement>('[data-flow-motion-travel="e0"] > g')!, position = new DOMPoint(0, 0).matrixTransform(actor.getScreenCTM()!);
    return { point: { x: point.x, y: point.y }, position: { x: position.x, y: position.y } };
  });
  expect(Math.abs(geometry.point.x - geometry.position.x)).toBeLessThan(.2); expect(Math.abs(geometry.point.y - geometry.position.y)).toBeLessThan(.2);
  await page.emulateMedia({ reducedMotion: "reduce" }); await expect(page.locator('.x6-node[data-cell-id="n3"]')).toHaveAttribute("opacity", "1");
  await expect(page.locator('[data-flow-motion-travel="e0"] > g')).toHaveAttribute("opacity", "0");
  await page.evaluate(() => window.flowFixture.editor().playback.close()); await expect(page.locator('.x6-node[data-cell-id="n3"]')).not.toHaveAttribute("opacity");
});

test("100/500/1000 graphs keep data motion sparse and avoid source, routing, overview and image updates", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled(); const records = [];
  for (const count of [100, 500, 1000]) {
    await page.evaluate(() => window.flowFixture.editor().playback.close()); await mountSmartGraph(page, count); await observeWork(page);
    await page.evaluate(() => { const p = window.flowFixture.editor().playback; p.load({ title: "sparse", presentation: "motion", steps: [{ id: "flow", title: "parallel", duration: 60000, changes: [], effects: [{ id: "e0", kind: "travel", payload: "vector" }, { id: "e1", kind: "travel", payload: "token", label: "data" }, { id: "e2", kind: "travel", payload: "beam", count: 2 }, { id: "n3", kind: "pulse", halo: true }] }] }); p.play(); });
    const phases = await page.evaluate(async () => { const frames = []; for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); frames.push(document.querySelector("[data-flow-motion-travel] > g")!.getAttribute("transform")); } window.flowFixture.editor().playback.pause(); return frames; });
    expect(new Set(phases).size).toBeGreaterThan(6); const work = await observedWork(page); expect(work).toEqual({ sourceReads: 0, serializations: 0, searches: 0, paths: {}, overview: [] }); records.push({ count, work, phases });
    await page.evaluate(() => window.flowWorkProbe?.restore());
  }
  await writeFile(info.outputPath("motion-work.json"), JSON.stringify(records, null, 2));
});

/** @param page - Isolated actual X6 instance. @param output - Evidence artifact path. @param kind - Canonical default-document sample. Writes a raster from exactly the tracked editable source. */
async function exportShowcase(page: import("@playwright/test").Page, output: string, kind: "attention" | "residual"): Promise<void> {
  const sample = JSON.parse(await readFile(new URL(`../../../apps/classic-editor-demo/src/showcase/flowchart/${kind}-sample.json`, import.meta.url), "utf8"));
  const source = sample.document as FlowchartDocument;
  await page.evaluate(value => { const e = window.flowFixture.editor(); e.playback.close(); e.replaceDocument(value); e.fit(); }, source);
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  const preview = await page.evaluate(async () => { const dataUrl = await window.flowFixture.editor().exportPng(), image = new Image(); image.src = dataUrl; await image.decode(); return { dataUrl, width: image.naturalWidth, height: image.naturalHeight }; });
  await writeFile(output, JSON.stringify({ ...sample, preview }, null, 2));
}

test("residual beams follow rounded bypasses, junction halos breathe, modules dim and dark narrow controls remain usable", async ({ page }, info) => {
  await page.goto("/"); await page.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "演示模式…", exact: true }).click();
  await page.evaluate(() => window.flowFixture.loadExample("residual"));
  await page.getByRole("button", { name: "2 注意力结果与原输入相加", exact: true }).click(); await page.evaluate(() => window.flowFixture.editor().playback.seekProgress(.5));
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), svg = await page.evaluate(() => window.flowFixture.editor().exportSvg()), png = await page.evaluate(() => window.flowFixture.editor().exportPng());
  await expect(page.locator("[data-flow-motion-halo]")).toHaveCount(2); await expect(page.locator("[data-flow-motion-beam]")).toHaveCount(8);
  await expect(page.locator('.x6-node[data-cell-id$="-ff"]')).toHaveAttribute("opacity", "0.32");
  await expect(page.locator('.x6-node[data-cell-id$="-attention"]')).toHaveAttribute("opacity", "1");
  const frames = await page.evaluate(async () => {
    const p = window.flowFixture.editor().playback; p.play(); const samples = [];
    for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); samples.push({ path: document.querySelector("[data-flow-motion-beam]")!.getAttribute("d"), halo: document.querySelector("[data-flow-motion-halo]")!.getAttribute("transform") }); }
    p.pause(); return samples;
  });
  expect(new Set(frames.map(frame => frame.path)).size).toBeGreaterThan(6); expect(new Set(frames.map(frame => frame.halo)).size).toBeGreaterThan(6);
  const trace = await page.evaluate(() => { const p = window.flowFixture.editor().playback, trace = p.getTrace(); p.close(); return trace; });
  expect(await page.evaluate(() => window.flowFixture.editor().exportSvg())).toEqual(svg);
  await page.evaluate(value => { const p = window.flowFixture.editor().playback; p.load(value); p.seek(2); p.seekProgress(.5); }, trace);
  await page.getByRole("button", { name: "切换明暗主题", exact: true }).click(); await page.screenshot({ path: info.outputPath("residual-dark.png") });
  await page.setViewportSize({ width: 960, height: 900 }); await page.getByRole("button", { name: "适应画布", exact: true }).click(); await page.screenshot({ path: info.outputPath("residual-narrow.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(960);
  await expect(page.getByRole("slider", { name: "步骤内预览", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "退出演示", exact: true }).click(); await expect(page.locator("[data-flow-authored-opacity]")).toHaveCount(0); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  await page.getByRole("button", { name: "切换明暗主题", exact: true }).click(); const after = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  // Theme/zoom changes remeasure X6's transparent label hit rects and may use a
  // different spelling for identity transforms. Painted content still agrees.
  await writeFile(info.outputPath("before.svg"), svg.svg); await writeFile(info.outputPath("after.svg"), after.svg);
  expect(after.source === svg.source).toBe(true); expect(await page.evaluate(() => window.flowFixture.editor().exportPng()) === png).toBe(true);
  await exportShowcase(page, info.outputPath("residual-sample.json"), "residual");
  await page.evaluate(() => window.flowFixture.setLocale("en")); await page.getByRole("button", { name: "Diagram", exact: true }).click(); await page.getByRole("menuitem", { name: "Presentation…", exact: true }).click();
  await page.evaluate(() => window.flowFixture.loadExample("residual", "en")); await page.getByRole("button", { name: "2 Add attention output to the input", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Residual connection animation", exact: true })).toBeVisible(); await expect(page.getByRole("slider", { name: "Preview within step", exact: true })).toBeVisible();
});
