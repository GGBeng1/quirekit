import { openFlowTemplates } from "./toolbar";
import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

test("six diagram types render real editable objects and retain atomic history and saved source", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  for (const [id, label, category] of [
    ["organization", "组织结构图", "组织结构"], ["fishbone", "鱼骨分析图", "分析图"], ["radial", "放射关系图", "关系组合"],
    ["cycle", "环形循环图", "时间与循环"], ["milestones", "里程碑时间轴", "时间与循环"], ["honeycomb", "六边形能力图", "关系组合"],
  ] as const) {
    const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
    await openFlowTemplates(page);
    const dialog = page.getByRole("dialog", { name: "选择图表模板" });
    await dialog.getByRole("button", { name: category, exact: true }).click();
    await dialog.getByRole("group", { name: "模板列表" }).getByRole("button", { name: label, exact: true }).click();
    await expect(dialog.getByRole("img", { name: `${label}预览`, exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "使用模板", exact: true }).click();
    const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
    if (id === "cycle") {
      const clearance = await page.evaluate(async () => {
        const graph = await window.flowFixture.editor().getDocument();
        return graph.edges.map(edge => {
          const target = "node" in edge.target ? edge.target.node : "";
          const path = document.querySelector<SVGPathElement>(`.qk-flow-editor__surface .x6-edge[data-cell-id="${edge.id}"] path[marker-end]`)!;
          const circle = document.querySelector<SVGPathElement>(`.qk-flow-editor__surface .x6-node[data-cell-id="${target}"] path`)!.getBoundingClientRect();
          const point = path.getPointAtLength(Math.max(0, path.getTotalLength() - 6)).matrixTransform(path.getScreenCTM()!);
          return Math.hypot(point.x - circle.x - circle.width / 2, point.y - circle.y - circle.height / 2) - circle.width / 2;
        });
      });
      expect(clearance).toHaveLength(6); expect(clearance.every(distance => distance > 1)).toBe(true);
    }
    for (const scheme of ["light", "dark"]) {
      if (scheme === "dark") await page.getByRole("button", { name: "切换明暗主题" }).click();
      const exported = await page.evaluate(async () => {
        const editor = window.flowFixture.editor(), snapshot = await editor.exportSvg(), png = await editor.exportPng();
        const svg = new DOMParser().parseFromString(snapshot.svg, "image/svg+xml"), image = new Image(); image.src = png; await image.decode();
        return { svg: snapshot.svg, png, errors: svg.querySelectorAll("parsererror").length, width: image.width,
          nodes: svg.querySelectorAll(".x6-node").length, edges: svg.querySelectorAll(".x6-edge").length,
          texts: Array.from(svg.querySelectorAll(".x6-node text")).map(node => node.textContent?.replace(/\s/g, "")),
        };
      });
      expect(exported.errors).toBe(0); expect(exported.nodes).toBe(source.nodes.length); expect(exported.edges).toBe(source.edges.length);
      expect(exported.width).toBeGreaterThan(300); expect(exported.svg).not.toMatch(/(?:NaN|Infinity)/);
      for (const node of source.nodes.filter(node => node.text)) expect(exported.texts).toContain(node.text.replace(/\s/g, ""));
      await writeFile(info.outputPath(`${id}-${scheme}.svg`), exported.svg);
      await writeFile(info.outputPath(`${id}-${scheme}.png`), Buffer.from(exported.png.split(",")[1]!, "base64"));
      if (scheme === "dark") await page.getByRole("button", { name: "切换明暗主题" }).click();
    }
    // The recipe must remain a normal editable graph, including history and
    // persistence; screenshots alone would miss a flattened or detached source.
    const target = source.nodes.find(node => node.text && node.shape !== "text")!;
    await page.evaluate(id => window.flowFixture.editor().select([id]), target.id);
    await page.getByRole("application", { name: "流程图编辑区", exact: true }).press("F2");
    await page.getByRole("textbox", { name: "图形文字" }).fill("已更新");
    await page.getByRole("textbox", { name: "图形文字" }).press("ControlOrMeta+Enter");
    expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.find(node => node.id === target.id)?.text).toBe("已更新");
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
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

test("fishbone junction dragging moves the real attachment and is reversible", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await openFlowTemplates(page);
  const dialog = page.getByRole("dialog", { name: "选择图表模板" });
  await dialog.getByRole("group", { name: "模板列表" }).getByRole("button", { name: "鱼骨分析图", exact: true }).click();
  await expect(dialog.getByRole("img", { name: "鱼骨分析图预览", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("diagram-gallery.png") });
  await dialog.getByRole("button", { name: "放大预览", exact: true }).click();
  await page.screenshot({ path: info.outputPath("fishbone-enlarged.png") });
  await dialog.getByRole("button", { name: "使用模板", exact: true }).click();
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const joint = source.nodes.find(node => node.shape === "circle" && source.edges.filter(edge => ("node" in edge.source && edge.source.node === node.id) || ("node" in edge.target && edge.target.node === node.id)).length === 4)!;
  const node = page.locator(`.qk-flow-editor__surface .x6-node[data-cell-id="${joint.id}"]`);
  const bounds = (await node.boundingBox())!, start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const connected = source.edges.filter(edge => ("node" in edge.source && edge.source.node === joint.id) || ("node" in edge.target && edge.target.node === joint.id));
  const paths = page.locator(connected.map(edge => `.qk-flow-editor__surface .x6-edge[data-cell-id="${edge.id}"] path[stroke]:not(.qk-flow-hit)`).join(","));
  const oldPaths = await paths.evaluateAll(items => items.map(item => item.getAttribute("d")));
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x + 50, start.y + 30, { steps: 12 }); await page.mouse.up();
  const moved = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(moved.nodes.find(node => node.id === joint.id)?.x).toBeGreaterThan(joint.x + 20);
  expect(moved.edges).toEqual(source.edges);
  expect(await paths.evaluateAll(items => items.map(item => item.getAttribute("d")))).not.toEqual(oldPaths);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
});
