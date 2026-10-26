import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { FlowchartPlaybackTrace } from "@quirekit/flowchart";
import { mountSmartGraph } from "./performance/fixture";
import { observeWork, observedWork } from "./performance/observer";
import "./types";

/** @param page - Isolated consumer page. Opens the same generic product entry as all three hosts. */
async function open(page: Page): Promise<void> {
  await page.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "演示模式…", exact: true }).click();
}

test("authors line flow on an existing diagram, previews presets and preserves static source/output", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const ids = await page.evaluate(async () => { const e = window.flowFixture.editor(), source = await e.getDocument(), ids = source.edges.slice(0, 2).map(edge => edge.id); e.select(ids); return ids; });
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), svg = await page.evaluate(() => window.flowFixture.editor().exportSvg()), png = await page.evaluate(() => window.flowFixture.editor().exportPng());
  await open(page); await expect(page.getByRole("button", { name: /载入.*(动画|示例)/ })).toHaveCount(0);
  await page.getByRole("button", { name: "新增步骤", exact: true }).click();
  await expect(page.getByText("已捕获 2 个目标", { exact: true })).toBeVisible(); await expect(page.getByRole("combobox", { name: "动效", exact: true })).toContainText("流动虚线");
  await page.getByRole("textbox", { name: "步骤标题", exact: true }).fill("我的数据通路");
  await page.getByRole("combobox", { name: "动效", exact: true }).click();
  for (const label of ["流动虚线", "亮段流动", "光点流动"]) await expect(page.getByRole("option", { name: label, exact: true }).locator(".qk-flow-playback__effect-preview")).toBeVisible();
  await page.screenshot({ path: info.outputPath("flow-presets.png") }); await page.getByRole("option", { name: "亮段流动", exact: true }).click();
  await page.getByRole("combobox", { name: "流动方向", exact: true }).click(); await page.getByRole("option", { name: "反向", exact: true }).click();
  await page.getByRole("combobox", { name: "流动速度", exact: true }).click(); await page.getByRole("option", { name: "快速", exact: true }).click();
  await page.getByRole("combobox", { name: "开始时间", exact: true }).click(); await page.getByRole("option", { name: "0.5 秒", exact: true }).click();
  await page.getByRole("button", { name: "添加步骤", exact: true }).click();
  await page.evaluate(async () => { const e = window.flowFixture.editor(); e.select((await e.getDocument()).nodes.slice(0, 2).map(node => node.id)); });
  // Live selection/tool markers are excluded from the static clone; changing
  // the selection must not alter the static picture or source contract.
  const selectedSvg = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(selectedSvg).toEqual(svg);
  await page.getByRole("button", { name: "播放演示", exact: true }).click(); await page.getByRole("button", { name: "暂停演示", exact: true }).click();
  await expect(page.locator(".x6-widget-selection-box").first()).toBeHidden();
  await page.evaluate(() => window.flowFixture.editor().playback.seekProgress(.5));
  const trace = await page.evaluate(() => window.flowFixture.editor().playback.getTrace());
  expect(trace.steps[0]!.effects).toEqual(ids.map(id => ({ id, kind: "flow", style: "beam", direction: "reverse", speed: 96, delay: 500, duration: 4500 })));
  await expect(page.locator('[data-flow-motion-flow][data-flow-style="beam"]')).toHaveCount(2);
  for (const path of await page.locator("[data-flow-motion-flow]").all()) { await expect(path).toHaveAttribute("stroke-dashoffset", "192"); await expect(path).toHaveAttribute("opacity", ".9"); }
  await expect(page.locator("[data-flow-motion-flow] circle")).toHaveCount(0);
  const animatedSvg = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  await writeFile(info.outputPath("flow-before.svg"), selectedSvg.svg); await writeFile(info.outputPath("flow-during.svg"), animatedSvg.svg);
  expect(animatedSvg).toEqual(selectedSvg); expect(await page.evaluate(() => window.flowFixture.editor().exportPng())).toBe(png);
  const phases = await page.evaluate(async () => {
    const p = window.flowFixture.editor().playback; p.play(); const frames = [];
    for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); frames.push(document.querySelector("[data-flow-motion-flow]")!.getAttribute("stroke-dashoffset")); }
    p.pause(); return frames;
  });
  expect(new Set(phases).size).toBeGreaterThan(6);
  const paused = await page.evaluate(async () => { const frames = []; for (let i = 0; i < 6; i++) { await new Promise(requestAnimationFrame); frames.push(document.querySelector("[data-flow-motion-flow]")!.getAttribute("stroke-dashoffset")); } return frames; });
  expect(new Set(paused).size).toBe(1);
  for (const progress of [0, 1]) { await page.evaluate(value => window.flowFixture.editor().playback.seekProgress(value), progress); for (const path of await page.locator("[data-flow-motion-flow]").all()) await expect(path).toHaveAttribute("opacity", "0"); }
  await page.getByRole("button", { name: "退出演示", exact: true }).click(); await expect(page.locator("[data-flow-authored-opacity]")).toHaveCount(0);
  await expect(page.locator(".x6-widget-selection-box").first()).toBeVisible();
  await expect(page.locator(".x6-node.has-widget-transform").first()).toBeAttached();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source); expect(await page.evaluate(() => window.flowFixture.editor().exportSvg())).toEqual(selectedSvg);
  await page.evaluate(value => window.flowFixture.editor().select(value), ids);
  await open(page); await page.getByRole("button", { name: "新增步骤", exact: true }).click();
  for (const width of [1440, 960, 620]) for (const locale of ["zh-CN", "en"]) {
    await page.setViewportSize({ width, height: 900 }); await page.evaluate(value => window.flowFixture.setLocale(value), locale);
    const box = await page.locator(".qk-flow-playback__scroll").evaluate(element => { const r = element.getBoundingClientRect(); return { width: element.clientWidth, content: element.scrollWidth, controls: [...element.querySelectorAll('input,textarea,[role="combobox"],button[type="submit"]')].map(control => { const b = control.getBoundingClientRect(); return { left: b.left - r.left, right: b.right - r.left }; }) }; });
    expect(box.content).toBeLessThanOrEqual(box.width + 1); for (const control of box.controls) { expect(control.left).toBeGreaterThanOrEqual(0); expect(control.right).toBeLessThanOrEqual(box.width + 1); }
  }
  await expect(page.getByRole("combobox", { name: "Flow direction", exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: /Load.*(animation|example)/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("flow-fields-narrow-en.png") });
});

test("authors parallel bypass flow and a delayed node halo in one step, with removal and cancellation", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const ids = await page.evaluate(async () => { const e = window.flowFixture.editor(), source = await e.getDocument(), edges = source.edges.slice(0, 2).map(edge => edge.id), node = source.nodes[1]!.id; e.select(edges); return { edges, node }; });
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), svg = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  await open(page); await page.getByRole("button", { name: "新增步骤", exact: true }).click(); await page.getByRole("textbox", { name: "步骤标题", exact: true }).fill("旁路与节点同时运行");
  await page.getByRole("button", { name: "追加动效", exact: true }).click(); await expect(page.getByText("已添加 2 个动效", { exact: true })).toBeVisible();
  await page.evaluate(id => window.flowFixture.editor().select([id]), ids.node); await page.getByRole("button", { name: "使用当前选择", exact: true }).click();
  await page.getByRole("combobox", { name: "动效", exact: true }).click(); await page.getByRole("option", { name: "扩散光环", exact: true }).click();
  await page.getByRole("combobox", { name: "开始时间", exact: true }).click(); await page.getByRole("option", { name: "0.5 秒", exact: true }).click();
  await page.getByRole("button", { name: "追加动效", exact: true }).click(); await expect(page.getByText("已添加 3 个动效", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "移除动效：扩散光环", exact: true }).click(); await expect(page.getByText("已添加 2 个动效", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用当前选择", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "使用当前选择", exact: true }).click(); await page.getByRole("combobox", { name: "动效", exact: true }).click(); await page.getByRole("option", { name: "扩散光环", exact: true }).click();
  await page.getByRole("combobox", { name: "开始时间", exact: true }).click(); await page.getByRole("option", { name: "0.5 秒", exact: true }).click(); await page.getByRole("button", { name: "追加动效", exact: true }).click();
  await page.getByRole("button", { name: "添加步骤", exact: true }).click();
  const selectedSvg = await page.evaluate(() => window.flowFixture.editor().exportSvg()); expect(selectedSvg.source).toBe(svg.source);
  await page.getByRole("button", { name: "1 旁路与节点同时运行", exact: true }).click(); await page.evaluate(() => window.flowFixture.editor().playback.seekProgress(.4));
  await expect(page.locator("[data-flow-motion-flow]")).toHaveCount(2); await expect(page.locator("[data-flow-motion-halo]")).toHaveCount(2);
  const trace = await page.evaluate(() => window.flowFixture.editor().playback.getTrace()); expect(trace.steps[0]!.effects?.map(effect => effect.id)).toEqual([...ids.edges, ids.node]);
  await page.getByRole("button", { name: "步骤操作：旁路与节点同时运行", exact: true }).click(); await page.getByRole("menuitem", { name: "编辑步骤", exact: true }).click();
  await page.getByRole("textbox", { name: "步骤说明", exact: true }).fill("不会保存的草稿"); await page.getByRole("button", { name: "取消", exact: true }).click(); await page.getByRole("button", { name: "1 旁路与节点同时运行", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().playback.getTrace())).steps).toEqual(trace.steps);
  await page.getByRole("button", { name: "退出演示", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  const after = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  await writeFile(info.outputPath("parallel-before.svg"), selectedSvg.svg); await writeFile(info.outputPath("parallel-after.svg"), after.svg); expect(after).toEqual(selectedSvg);
});

test("flow keeps exact native curves and equal speed on short/long edges, with direction, delay and reduced motion", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [], edges: [
      { id: "short", source: { x: 100, y: 60 }, target: { x: 130, y: 60 }, vertices: [], routing: "straight", label: "短线", labelPosition: .5, style: {} },
      { id: "long", source: { x: 100, y: 160 }, target: { x: 510, y: 360 }, vertices: [{ x: 410, y: 160 }, { x: 410, y: 360 }], connector: "rounded", routing: "straight", label: "圆角通路", labelPosition: .5, style: {} },
    ] }); e.fit();
  });
  const svg = await page.evaluate(() => window.flowFixture.editor().exportSvg());
  const trace: FlowchartPlaybackTrace = { title: "flow", presentation: "motion", steps: [{ id: "one", title: "传递", duration: 10000, changes: [], effects: [
    { id: "short", kind: "flow", style: "dot", speed: 48, delay: 2000 }, { id: "long", kind: "flow", style: "beam", speed: 48, delay: 2000, direction: "reverse" },
  ] }] };
  await page.evaluate(value => { const p = window.flowFixture.editor().playback; p.load(value); p.seek(1); p.seekProgress(.25); }, trace);
  await expect(page.locator('[data-flow-motion-flow="short"]')).toHaveAttribute("stroke-dashoffset", "-24"); await expect(page.locator('[data-flow-motion-flow="long"]')).toHaveAttribute("stroke-dashoffset", "24");
  const geometry = await page.evaluate(() => ["short", "long"].map(id => ({ id, native: document.querySelector(`.x6-edge[data-cell-id="${id}"] > path`)!.getAttribute("d"), flow: document.querySelector(`[data-flow-motion-flow="${id}"]`)!.getAttribute("d") })));
  for (const path of geometry) expect(path.flow).toBe(path.native);
  await page.screenshot({ path: info.outputPath("short-and-rounded-flow.png") });
  await page.getByRole("button", { name: "切换明暗主题", exact: true }).click(); await expect(page.locator('[data-flow-motion-flow="long"]')).toHaveAttribute("stroke-dashoffset", "24");
  await page.screenshot({ path: info.outputPath("short-and-rounded-flow-dark.png") });
  await page.emulateMedia({ reducedMotion: "reduce" }); for (const path of await page.locator("[data-flow-motion-flow]").all()) await expect(path).toHaveAttribute("opacity", "0");
  await page.evaluate(() => window.flowFixture.editor().playback.close()); await expect(page.locator("[data-flow-authored-opacity]")).toHaveCount(0);
  await page.getByRole("button", { name: "切换明暗主题", exact: true }).click(); expect((await page.evaluate(() => window.flowFixture.editor().exportSvg())).source).toBe(svg.source);
});

test("100/500/1000 diagrams animate only current flow paths without source, geometry or semantic reads each frame", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled(); const evidence = [];
  for (const count of [100, 500, 1000]) {
    await page.evaluate(() => window.flowFixture.editor().playback.close()); await mountSmartGraph(page, count); await observeWork(page);
    const sample = await page.evaluate(async () => {
      const p = window.flowFixture.editor().playback; p.load({ title: "flow", steps: [{ id: "flow", title: "流动", duration: 60000, changes: [], effects: [{ id: "e0", kind: "flow" }, { id: "e1", kind: "flow", style: "dot" }, { id: "e2", kind: "flow", style: "beam" }] }] }); p.play();
      let semantic = 0, geometry = 0; const off = p.subscribe(() => semantic++), read = SVGPathElement.prototype.getPointAtLength, length = SVGPathElement.prototype.getTotalLength;
      SVGPathElement.prototype.getPointAtLength = function(value) { geometry++; return read.call(this, value); }; SVGPathElement.prototype.getTotalLength = function() { geometry++; return length.call(this); };
      semantic = 0; const frames = [];
      try { for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); frames.push([...document.querySelectorAll("[data-flow-motion-flow]")].map(path => path.getAttribute("stroke-dashoffset"))); } return { semantic, geometry, frames }; }
      finally { SVGPathElement.prototype.getPointAtLength = read; SVGPathElement.prototype.getTotalLength = length; off(); p.pause(); }
    });
    for (let i = 0; i < 3; i++) expect(new Set(sample.frames.map(frame => frame[i])).size).toBeGreaterThan(6);
    expect(sample.semantic).toBe(0); expect(sample.geometry).toBe(0); const work = await observedWork(page); expect(work).toEqual({ sourceReads: 0, serializations: 0, searches: 0, paths: {}, overview: [] }); evidence.push({ count, ...sample, work });
    await page.evaluate(() => window.flowWorkProbe?.restore());
  }
  await writeFile(info.outputPath("flow-work.json"), JSON.stringify(evidence, null, 2));
});
