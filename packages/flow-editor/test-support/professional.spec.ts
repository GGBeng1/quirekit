import { openFlowStructure, openFlowTemplates } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

/** @param page - Independent acceptance tab. @param label - Public template name. */
async function apply(page: Page, label: string): Promise<void> {
  await openFlowTemplates(page);
  const dialog = page.getByRole("dialog", { name: "选择图表模板" });
  await dialog.getByRole("group", { name: "模板列表" }).getByRole("button", { name: label, exact: true }).click();
  await dialog.getByRole("button", { name: "使用模板", exact: true }).click();
}
/** @param page - Independent acceptance tab. @param label - Executable item. @param group - Optional submenu. */
async function structure(page: Page, label: string, group?: string): Promise<void> {
  await openFlowStructure(page, label);
  if (group) await page.getByRole("menuitem", { name: group, exact: true }).hover();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
});

test("advanced sequence template keeps open strokes, actual self-call and guards through styles and export", async ({ page }, info) => {
  await apply(page, "异步任务时序图");
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(before.nodes.some(n => n.shape === "actor-lifeline")).toBe(true);
  const self = before.edges.find(e => "node" in e.source && "node" in e.target && e.source.node === e.target.node)!;
  expect(self.vertices).toHaveLength(2);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  for (const [label, style] of [["标准 · 清晰线条", "standard"], ["轻手绘 · 自然笔触", "sketch"], ["铅笔 · 手绘排线", "pencil"]] as const) {
    await page.getByRole("button", { name: "绘制风格", exact: true }).click();
    await page.getByRole("menuitem", { name: label, exact: true }).click();
    const exported = await page.evaluate(async () => {
      const editor = window.flowFixture.editor(), snapshot = await editor.exportSvg(), png = await editor.exportPng();
      const svg = new DOMParser().parseFromString(snapshot.svg, "image/svg+xml"), image = new Image(); image.src = png; await image.decode();
      return { svg: snapshot.svg, png, width: image.width, nodes: svg.querySelectorAll(".x6-node").length, text: svg.documentElement.textContent };
    });
    expect(exported.svg).not.toMatch(/NaN|Infinity|qk-flow-hit/); expect(exported.nodes).toBe(before.nodes.length);
    expect(exported.text).toContain("队列中还有任务"); expect(exported.text).toContain("执行任务"); expect(exported.width).toBeGreaterThan(800);
    await writeFile(info.outputPath(`sequence-${style}.png`), Buffer.from(exported.png.split(",")[1]!, "base64"));
    await page.screenshot({ path: info.outputPath(`sequence-${style}-workspace.png`) });
  }
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const restored = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(restored.nodes.map(n => n.shape)).toEqual(before.nodes.map(n => n.shape));
  expect(restored.edges.find(e => e.id === self.id)?.vertices).toEqual(self.vertices);
  expect(errors).toEqual([]);
});

test("sequence menus create actor, async, self-call, editable fragments and an undoable termination", async ({ page }, info) => {
  await apply(page, "空白流程图");
  await structure(page, "添加人物参与者"); await structure(page, "添加参与者");
  let source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const ids = source.nodes.map(n => n.id);
  await page.evaluate(ids => window.flowFixture.editor().select(ids), ids);
  await structure(page, "添加异步消息");
  source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(source.edges[0]?.style).toMatchObject({ targetArrow: "open", dashed: false });
  await page.evaluate(id => window.flowFixture.editor().select([id]), ids[1]!); await structure(page, "添加自调用");
  source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(source.edges.at(-1)?.vertices).toHaveLength(2);
  await page.evaluate(ids => window.flowFixture.editor().select(ids), ids);
  await structure(page, "alt · 条件分支", "时序片段");
  const withFrame = await page.evaluate(() => window.flowFixture.editor().getDocument()), frame = withFrame.nodes.find(n => n.shape === "sequence-alt")!;
  expect(withFrame.nodes.filter(n => n.parent === frame.id)).toHaveLength(2);
  expect(withFrame.nodes.slice(0, 2)).toEqual(source.nodes);
  const guard = withFrame.nodes.find(n => n.parent === frame.id)!;
  await page.evaluate(id => window.flowFixture.editor().select([id]), guard.id);
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("F2");
  await page.getByRole("textbox", { name: "图形文字" }).fill("[权限校验通过]");
  await page.getByRole("textbox", { name: "图形文字" }).press("ControlOrMeta+Enter");
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.evaluate(() => window.flowFixture.editor().select([]));
  const bounds = (await page.locator(`.x6-node[data-cell-id="${frame.id}"] > path`).first().boundingBox())!;
  await page.mouse.move(bounds.x + 10, bounds.y + 10); await page.mouse.down();
  await page.mouse.move(bounds.x + 40, bounds.y + 34, { steps: 8 }); await page.mouse.up();
  const moved = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(moved.nodes.find(n => n.id === guard.id)!.x).toBeGreaterThan(guard.x);
  expect(moved.nodes.slice(0, 2)).toEqual(source.nodes); expect(moved.edges).toEqual(source.edges);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await page.evaluate(id => window.flowFixture.editor().select([id]), ids[1]!);
  const beforeDestroy = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await structure(page, "销毁参与者");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.at(-1)).toMatchObject({ shape: "destruction", parent: ids[1] });
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(beforeDestroy);
  for (const [label, shape] of [["opt · 可选执行", "sequence-opt"], ["loop · 循环", "sequence-loop"]]) {
    await structure(page, label!, "时序片段");
    expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.some(n => n.shape === shape)).toBe(true);
    await page.getByRole("button", { name: "撤销", exact: true }).click();
  }
  await page.screenshot({ path: info.outputPath("sequence-fragment.png") });
});

for (const vertical of [false, true]) test(`lane menu reorders, sizes, inserts phases and deletes atomically (${vertical ? "vertical" : "horizontal"})`, async ({ page }, info) => {
  await apply(page, vertical ? "泳道流程图（纵向）" : "泳道流程图（横向）");
  const initial = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const lanes = initial.nodes.filter(n => n.shape === (vertical ? "lane-vertical" : "lane-horizontal"));
  const lane = lanes[1]!, member = initial.nodes.find(n => n.parent === lane.id)!;
  await page.evaluate(id => window.flowFixture.editor().select([id]), lane.id);
  await structure(page, "泳道前移", "泳道操作");
  const reordered = await page.evaluate(() => window.flowFixture.editor().getDocument()), axis = vertical ? "x" : "y";
  expect(reordered.nodes.find(n => n.id === lane.id)![axis]).toBe(lanes[0]![axis]);
  expect(reordered.nodes.find(n => n.id === member.id)![axis] - member[axis]).toBe(lanes[0]![axis] - lane[axis]);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(initial);
  await page.evaluate(id => window.flowFixture.editor().select([id]), lane.id);
  await structure(page, "添加阶段分隔线", "泳道操作");
  const withPhase = await page.evaluate(() => window.flowFixture.editor().getDocument()), phase = withPhase.nodes.at(-1)!;
  expect(phase.shape).toBe(vertical ? "phase-horizontal" : "phase-vertical");
  await page.evaluate(id => window.flowFixture.editor().select([id]), lane.id);
  await structure(page, "在后面添加泳道", "泳道操作");
  const added = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(added.nodes.filter(n => n.shape === lane.shape)).toHaveLength(4);
  const dimension = vertical ? "width" : "height";
  expect(added.nodes.find(n => n.id === phase.id)![dimension]).toBeGreaterThan(phase[dimension]);
  await structure(page, "统一泳道尺寸", "泳道操作");
  const equal = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const phasePath = page.locator(`.x6-node[data-cell-id="${phase.id}"] > path`).nth(3);
  const equalPath = await phasePath.getAttribute("d");
  const renderedPhase = await phasePath.evaluate((path: SVGPathElement) => { const box = path.getBBox(); return { width: box.width, height: box.height }; });
  expect(renderedPhase[dimension]).toBeGreaterThan(equal.nodes.find(n => n.id === phase.id)![dimension] - (vertical ? 110 : 40));
  expect(new Set(equal.nodes.filter(n => n.shape === lane.shape).map(n => `${n.width}:${n.height}`)).size).toBe(1);
  await page.evaluate(id => window.flowFixture.editor().select([id]), lane.id);
  await structure(page, "删除泳道及内容", "泳道操作");
  const removed = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(removed.nodes.some(n => n.id === member.id || n.id === lane.id)).toBe(false);
  expect(removed.edges.every(e => !("node" in e.source && e.source.node === member.id) && !("node" in e.target && e.target.node === member.id))).toBe(true);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(equal);
  expect(await phasePath.getAttribute("d")).toBe(equalPath);
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.screenshot({ path: info.outputPath("swimlane-operations.png") });
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const reopened = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(reopened.nodes).toEqual(equal.nodes); expect(reopened.edges).toEqual(equal.edges);
});
