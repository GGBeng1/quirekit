import { openFlowTemplates } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import "./types";

/** @param page - Private context. @param name - Real original class template. Installs through the public gallery. */
async function setup(page: Page, name = "订单领域类图"): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await openFlowTemplates(page);
  const gallery = page.getByRole("dialog", { name: "选择图表模板" });
  await gallery.getByRole("button", { name: "UML 类图", exact: true }).click();
  await expect(gallery.getByRole("group", { name: "模板列表" }).getByRole("button")).toHaveCount(3);
  await gallery.getByRole("button", { name, exact: true }).click(); await gallery.getByRole("button", { name: "使用模板", exact: true }).click();
  await expect(gallery).toBeHidden();
  await page.evaluate(async () => { const e = window.flowFixture.editor(); e.select([(await e.getDocument()).nodes[0]!.id]); });
}

/** @param page - Actual SVG canvas. @param id - Canonical edge ID. @returns Only the marker geometry currently referenced by the visible line. */
async function endpoints(page: Page, id: string) {
  return page.locator(`.x6-edge[data-cell-id="${id}"]`).evaluate(node => {
    const line = node.querySelector(":scope > path[stroke-dasharray]")!;
    return ["marker-start", "marker-end"].map(name => {
      const reference = line.getAttribute(name);
      if (!reference || reference === "none") return null;
      const marker = node.ownerDocument.getElementById(reference.slice(5, -1))!;
      return [...marker.querySelectorAll("path")].map(p => ({ d: p.getAttribute("d"), fill: p.getAttribute("fill"), stroke: p.getAttribute("stroke") }));
    });
  });
}

test("class compartments edit literal attributes and operations with atomic history and source-backed export", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const artifact = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument(), png = await editor.exportPng(), img = new Image(); img.src = png; await img.decode();
    return { type: "quirekit-flowchart-embed", version: 1, id: "showcase-flowchart-uml", title: "订单领域类图", document: source, preview: { dataUrl: png, width: img.width, height: img.height } };
  });
  await writeFile(info.outputPath("uml-example.json"), JSON.stringify(artifact));
  await writeFile(info.outputPath("uml-example.png"), Buffer.from(artifact.preview.dataUrl.split(",")[1]!, "base64"));
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await page.getByRole("button", { name: "编辑类成员", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑类成员", exact: true });
  await dialog.getByRole("textbox", { name: "类名称", exact: true }).fill("PurchaseOrder");
  await dialog.getByRole("textbox", { name: "属性（每行一个）", exact: true }).fill("- id: UUID\n# description: string");
  await dialog.getByRole("textbox", { name: "方法（每行一个）", exact: true }).fill("+ submit(): void\n+ cancel(reason: string): boolean\n~ validate(): boolean");
  await page.screenshot({ animations: "disabled", path: info.outputPath("class-members.png") });
  await dialog.getByRole("button", { name: "应用类成员", exact: true }).click(); await expect(dialog).toBeHidden();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes[0]).toMatchObject({ text: "PurchaseOrder", uml: { attributes: ["- id: UUID", "# description: string"], operations: ["+ submit(): void", "+ cancel(reason: string): boolean", "~ validate(): boolean"] } });
  const shape = page.locator(`.x6-node[data-cell-id="${after.nodes[0]!.id}"]`); await expect(shape).toContainText("submit");
  const geometry = await shape.evaluate(node => {
    const texts = [...node.querySelectorAll<SVGTextElement>("text")];
    const attribute = texts.find(n => n.textContent?.includes("description"))!, operation = texts.find(n => n.textContent?.includes("submit"))!;
    return { a: attribute.getBBox().y + attribute.getBBox().height, o: operation.getBBox().y };
  });
  expect(geometry.a).toBeLessThan(geometry.o);
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(after.nodes);
});

test("six UML relation presets render correct endpoint geometry and preserve unrelated edge data", async ({ page }, info) => {
  await setup(page, "通知服务类图");
  await page.evaluate(async () => { const e = window.flowFixture.editor(); e.select([(await e.getDocument()).edges[0]!.id]); });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const originalMarkers = await endpoints(page, before.edges[0]!.id);
  for (const [label, sourceArrow, targetArrow, dashed] of [
    ["关联", "none", "none", false], ["依赖", "none", "open", true], ["泛化", "none", "triangle-hollow", false],
    ["实现", "none", "triangle-hollow", true], ["聚合", "diamond-hollow", "none", false], ["组合", "diamond", "none", false],
  ] as const) {
    await page.getByRole("button", { name: "连线设置", exact: true }).click(); await page.getByRole("menuitem", { name: "关系预设", exact: true }).hover();
    const option = page.getByRole("menuitemradio", { name: `UML · ${label}`, exact: true });
    await expect(option.locator(".qk-flow-style-preview")).toBeVisible(); await option.click();
    const doc = await page.evaluate(() => window.flowFixture.editor().getDocument());
    expect(doc.edges[0]!.style).toEqual({ ...before.edges[0]!.style, sourceArrow, targetArrow, dashed });
    expect(doc.edges[0]!.vertices).toEqual(before.edges[0]!.vertices); expect(doc.edges[0]!.label).toBe(before.edges[0]!.label);
    const markers = await endpoints(page, before.edges[0]!.id);
    for (const [index, arrow] of [sourceArrow, targetArrow].entries()) {
      if (arrow === "none") expect(markers[index], `${label} endpoint ${index}`).toBeNull();
      else {
        expect(markers[index]?.length).toBeGreaterThan(0);
        if (arrow.endsWith("-hollow")) expect(markers[index]!.every(p => p.fill !== "none" && p.fill !== p.stroke)).toBe(true);
      }
    }
    if (JSON.stringify(doc) !== JSON.stringify(before)) await page.getByRole("button", { name: "撤销", exact: true }).click();
    expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
    expect(await endpoints(page, before.edges[0]!.id)).toEqual(originalMarkers);
  }
  await page.evaluate(() => window.flowFixture.editor().select([]));
  for (const drawing of ["standard", "sketch", "pencil"] as const) {
    const result = await page.evaluate(async drawing => {
      const e = window.flowFixture.editor(); e.setDrawingStyle(drawing); const svg = await e.exportSvg(), png = await e.exportPng();
      const xml = new DOMParser().parseFromString(svg.svg, "image/svg+xml");
      const references = [...xml.querySelectorAll(".x6-edge > path")].flatMap(p => [p.getAttribute("marker-start"), p.getAttribute("marker-end")]).filter((r): r is string => !!r && r.startsWith("url(#"));
      const hollow = [...new Set(references)].flatMap(r => [...xml.getElementById(r.slice(5, -1))!.querySelectorAll("path")]).filter(p => p.getAttribute("d")?.includes("12 -7"));
      return { svg: svg.svg, png, hollow: hollow.map(p => ({ fill: p.getAttribute("fill"), stroke: p.getAttribute("stroke") })) };
    }, drawing);
    await writeFile(info.outputPath(`uml-${drawing}.svg`), result.svg);
    await writeFile(info.outputPath(`uml-${drawing}.png`), Buffer.from(result.png.split(",")[1]!, "base64"));
    expect(result.hollow.length).toBeGreaterThan(0); expect(result.hollow.every(p => p.fill !== "none" && p.fill !== p.stroke), JSON.stringify(result.hollow)).toBe(true);
    expect(result.svg).toContain("MailTransport");
  }
});

test("class member drafts cancel, reject oversized rows and revoke on target or permission changes", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "切换明暗主题" }).click(); await page.setViewportSize({ width: 480, height: 780 });
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await page.getByRole("button", { name: "编辑类成员", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑类成员", exact: true }), attributes = dialog.getByRole("textbox", { name: "属性（每行一个）", exact: true });
  await attributes.fill("x".repeat(301)); await expect(dialog.getByRole("button", { name: "应用类成员" })).toBeDisabled();
  await attributes.fill("+ 中文名称: string"); await attributes.dispatchEvent("compositionstart");
  await expect(dialog.getByRole("button", { name: "应用类成员" })).toBeDisabled(); await attributes.dispatchEvent("compositionend");
  await expect(dialog.getByRole("button", { name: "应用类成员" })).toBeInViewport();
  await page.screenshot({ animations: "disabled", path: info.outputPath("class-dark-narrow.png") });
  await dialog.getByRole("button", { name: "取消", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await page.getByRole("button", { name: "编辑类成员", exact: true }).click();
  await page.evaluate(async () => { const e = window.flowFixture.editor(); e.select([(await e.getDocument()).nodes[1]!.id]); }); await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await page.getByRole("button", { name: "编辑类成员", exact: true }).click(); await page.evaluate(() => window.flowFixture.editor().setReadOnly(true)); await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "图形属性", exact: true })).toBeDisabled();
});
