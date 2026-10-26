import { openFlowStructure, openFlowTemplates } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

/** @param page - Isolated browser host. @param label - Public template name. */
async function apply(page: Page, label: string): Promise<void> {
  await openFlowTemplates(page);
  const dialog = page.getByRole("dialog", { name: "选择图表模板" });
  await dialog.getByRole("group", { name: "模板列表" }).getByRole("button", { name: label, exact: true }).click();
  if (label !== "空白流程图") await expect(dialog.getByRole("img", { name: `${label}预览`, exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "使用模板", exact: true }).click();
}
/** @param page - Isolated browser host. @param label - Structure menu action. */
async function structure(page: Page, label: string): Promise<void> {
  await openFlowStructure(page, label);
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}
/** @param page - Isolated browser host. @param id - Canonical cell identity. @returns Painted header geometry without ports/selection handles. */
async function header(page: Page, id: string) {
  return (await page.locator(`.qk-flow-editor__surface .x6-node[data-cell-id="${id}"] path`).first().boundingBox())!;
}
test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
});

test("structured templates export real members in both themes and preserve save/undo", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const [id, label] of [["sequence", "用户登录时序图"], ["architecture", "系统架构设计"],
    ["horizontal", "泳道流程图（横向）"], ["vertical", "泳道流程图（纵向）"]] as const) {
    const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
    await apply(page, label);
    const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
    expect(source.nodes.some(node => node.parent)).toBe(true);
    for (const scheme of ["light", "dark"]) {
      if (scheme === "dark") await page.getByRole("button", { name: "切换明暗主题" }).click();
      const exported = await page.evaluate(async () => {
        const editor = window.flowFixture.editor(), snapshot = await editor.exportSvg(), png = await editor.exportPng();
        const svg = new DOMParser().parseFromString(snapshot.svg, "image/svg+xml"), image = new Image(); image.src = png; await image.decode();
        return { svg: snapshot.svg, png, errors: svg.querySelectorAll("parsererror").length, width: image.width,
          nodes: svg.querySelectorAll(".x6-node").length, edges: svg.querySelectorAll(".x6-edge").length,
          texts: Array.from(svg.querySelectorAll(".x6-node text")).map(node => node.textContent?.replace(/\s/g, "")) };
      });
      expect(exported.errors).toBe(0); expect(exported.nodes).toBe(source.nodes.length); expect(exported.edges).toBe(source.edges.length);
      expect(exported.width).toBeGreaterThan(500); expect(exported.svg).not.toMatch(/(?:NaN|Infinity)/);
      for (const node of source.nodes.filter(node => node.text)) expect(exported.texts).toContain(node.text.replace(/\s/g, ""));
      await writeFile(info.outputPath(`${id}-${scheme}.svg`), exported.svg);
      await writeFile(info.outputPath(`${id}-${scheme}.png`), Buffer.from(exported.png.split(",")[1]!, "base64"));
      if (scheme === "dark") await page.getByRole("button", { name: "切换明暗主题" }).click();
    }
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
    await page.getByRole("button", { name: "重做", exact: true }).click();
    await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
    await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
    const reopened = await page.evaluate(() => window.flowFixture.editor().getDocument());
    expect(reopened.nodes).toEqual(source.nodes); expect(reopened.edges).toEqual(source.edges);
  }
  expect(errors).toEqual([]);
});

test("architecture movement tracks all descendants and duplication/deletion is atomic", async ({ page }) => {
  await apply(page, "系统架构设计");
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), root = source.nodes.find(node => !node.parent)!;
  const member = source.nodes.find(node => node.text === "身份认证")!, bounds = await header(page, root.id), child = await header(page, member.id);
  await page.evaluate(() => {
    const editor = window.flowFixture.editor(), original = editor.getDocument; let reads = 0;
    editor.getDocument = () => { reads++; return original(); }; Object.assign(window, { structureReads: () => reads });
  });
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 12); await page.mouse.down();
  for (let step = 1; step <= 4; step++) {
    await page.mouse.move(bounds.x + bounds.width / 2 + step * 12, bounds.y + 12 + step * 8);
    expect((await header(page, member.id)).x).toBeGreaterThan(child.x + step * 6);
  }
  await page.mouse.up();
  expect(await page.evaluate(() => (window as unknown as { structureReads(): number }).structureReads())).toBe(0);
  const moved = await page.evaluate(() => window.flowFixture.editor().getDocument()), next = moved.nodes.find(node => node.id === root.id)!;
  for (const node of moved.nodes) {
    const old = source.nodes.find(item => item.id === node.id)!;
    expect(node.x - old.x).toBeCloseTo(next.x - root.x); expect(node.y - old.y).toBeCloseTo(next.y - root.y);
    expect(node.parent).toBe(old.parent);
  }
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  await page.evaluate(id => window.flowFixture.editor().select([id]), root.id);
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("ControlOrMeta+D");
  const copied = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(copied.nodes.length).toBe(source.nodes.length * 2); expect(copied.edges.length).toBe(source.edges.length * 2);
  for (const node of copied.nodes.slice(source.nodes.length).filter(node => node.parent)) expect(node.parent).not.toBe(source.nodes.find(item => item.text === node.text)?.parent);
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("Delete");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(copied);
  await page.evaluate(id => window.flowFixture.editor().select([id]), member.id);
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("ControlOrMeta+D");
  const detached = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(detached.nodes.at(-1)?.parent).toBeUndefined(); expect(detached.nodes.at(-1)?.text).toBe(member.text);
});

test("swimlane drop changes membership with one-step undo and blank interior stays selectable", async ({ page }) => {
  await apply(page, "泳道流程图（横向）");
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const member = source.nodes.find(node => node.text === "提交申请")!, lanes = source.nodes.filter(node => node.shape === "lane-horizontal");
  const bounds = await header(page, member.id), scale = await page.evaluate(() => window.flowFixture.editor().getState().scale);
  const dy = (lanes[1]!.y - lanes[0]!.y) * scale;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + dy, { steps: 14 }); await page.mouse.up();
  const moved = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(moved.nodes.find(node => node.id === member.id)?.parent).toBe(lanes[1]!.id);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  await page.evaluate(() => window.flowFixture.editor().select([]));
  const b = await header(page, member.id);
  await page.mouse.move(b.x - 8, b.y - 8); await page.mouse.down();
  await page.mouse.move(b.x + b.width + 8, b.y + b.height + 8, { steps: 8 }); await page.mouse.up();
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toContain(member.id);
});

test("sequence participants own activations, real anchors follow and menu messages preserve prior heights", async ({ page }) => {
  await apply(page, "用户登录时序图");
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const actors = source.nodes.filter(node => node.shape === "lifeline"), actor = actors[1]!, activation = source.nodes.find(node => node.parent === actor.id)!;
  const bounds = await header(page, actor.id), bar = await header(page, activation.id);
  const edge = source.edges.find(edge => "node" in edge.target && edge.target.node === activation.id)!;
  const path = page.locator(`.qk-flow-editor__surface .x6-edge[data-cell-id="${edge.id}"] path[marker-end]`), beforePath = await path.getAttribute("d");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 45, bounds.y + bounds.height / 2 + 40, { steps: 12 });
  expect((await header(page, activation.id)).x).toBeGreaterThan(bar.x + 25); expect(await path.getAttribute("d")).not.toBe(beforePath);
  await page.mouse.up();
  const moved = await page.evaluate(() => window.flowFixture.editor().getDocument()), updated = moved.nodes.find(node => node.id === actor.id)!;
  expect(updated.y).toBe(actor.y); expect(updated.parent).toBe(actor.parent);
  expect(moved.nodes.find(node => node.id === activation.id)!.x - activation.x).toBeCloseTo(updated.x - actor.x);
  await page.evaluate(id => window.flowFixture.editor().select([id]), actor.id);
  await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("F2");
  const input = page.getByRole("textbox", { name: "图形文字" }); await expect(input).toBeVisible(); expect((await input.boundingBox())!.height).toBeLessThan(100);
  await input.fill("Web 客户端"); await input.press("ControlOrMeta+Enter");
  await page.evaluate(ids => window.flowFixture.editor().select(ids), [actors[0]!.id, actor.id]);
  await structure(page, "添加请求消息");
  const request = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(request.edges.length).toBe(source.edges.length + 1); expect(request.edges.at(-1)?.label).toBe("请求");
  await page.evaluate(ids => window.flowFixture.editor().select(ids), [actors[0]!.id, actor.id]);
  await structure(page, "添加返回消息");
  const reply = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(reply.edges.at(-1)?.style).toMatchObject({ dashed: true, targetArrow: "open" });
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(request);
  await page.evaluate(id => window.flowFixture.editor().select([id]), actor.id);
  await structure(page, "添加激活条");
  const extended = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(extended.nodes.at(-1)?.parent).toBe(actor.id); expect(extended.nodes.find(node => node.id === actor.id)!.height).toBeGreaterThan(actor.height);
  for (const edge of request.edges) for (const end of ["source", "target"] as const) {
    const old = edge[end], next = extended.edges.find(item => item.id === edge.id)![end];
    if (!("node" in old) || !("node" in next) || !old.anchor || !next.anchor) throw new Error("Expected relative message anchor");
    const oldNode = request.nodes.find(node => node.id === old.node)!, nextNode = extended.nodes.find(node => node.id === next.node)!;
    expect(nextNode.y + next.anchor.y * nextNode.height).toBeCloseTo(oldNode.y + old.anchor.y * oldNode.height);
  }
  await structure(page, "添加参与者");
  const more = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const last = more.nodes.at(-1)!, owner = more.nodes.find(node => node.id === last.parent)!;
  expect(last.shape).toBe("lifeline"); expect(owner.x + owner.width).toBeGreaterThan(last.x + last.width);
  await page.getByRole("button", { name: "切换只读" }).click();
  await expect(page.getByRole("button", { name: "插入与结构", exact: true })).toBeDisabled();
});

test("structure menu creates an editable sequence from blank and activation resizing stays owned", async ({ page }) => {
  await apply(page, "空白流程图");
  await structure(page, "添加分层容器");
  await structure(page, "添加横向泳道");
  await structure(page, "添加纵向泳道");
  const primitives = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(primitives.nodes.map(node => node.shape)).toEqual(["container", "lane-horizontal", "lane-vertical"]);
  await apply(page, "空白流程图");
  await structure(page, "添加参与者"); await structure(page, "添加参与者"); await structure(page, "添加激活条");
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), bar = source.nodes.at(-1)!;
  await page.evaluate(() => window.flowFixture.editor().select([]));
  const bounds = await header(page, bar.id); await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  const grip = page.locator('.x6-widget-transform-resize[data-position="bottom-right"]'); await expect(grip).toBeVisible();
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 45, { steps: 10 }); await page.mouse.up();
  const resized = await page.evaluate(() => window.flowFixture.editor().getDocument()), changed = resized.nodes.find(node => node.id === bar.id)!;
  expect(changed.width).toBe(20); expect(changed.height).toBeGreaterThan(bar.height + 20); expect(changed.parent).toBe(bar.parent);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  await page.evaluate(ids => window.flowFixture.editor().select(ids), source.nodes.filter(node => node.shape === "lifeline").map(node => node.id));
  await structure(page, "添加请求消息");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[0]!.target).toMatchObject({ node: bar.id });
});
