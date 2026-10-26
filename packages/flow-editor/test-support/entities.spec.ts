import { openFlowTemplates } from "./toolbar";
import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import "./types";

/** @param page - Private browser context. Installs an original ER template through the actual gallery. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await openFlowTemplates(page);
  const gallery = page.getByRole("dialog", { name: "选择图表模板" });
  await gallery.getByRole("button", { name: "ER 图", exact: true }).click();
  await expect(gallery.getByRole("group", { name: "模板列表" }).getByRole("button")).toHaveCount(3);
  await gallery.getByRole("button", { name: "订单数据模型", exact: true }).click();
  await gallery.getByRole("button", { name: "使用模板", exact: true }).click();
  await expect(gallery).toBeHidden();
  await page.evaluate(async () => { const editor = window.flowFixture.editor(); editor.select([(await editor.getDocument()).nodes[0]!.id]); });
}

test("entity fields, keys and order are editable as one history operation and survive export and reopen", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  // Preserve a genuine source-bound preview for the canonical Classic example.
  const artifact = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument(), png = await editor.exportPng(), img = new Image(); img.src = png; await img.decode();
    return { type: "quirekit-flowchart-embed", version: 1, id: "showcase-flowchart-er", title: "订单数据模型", document: source, preview: { dataUrl: png, width: img.width, height: img.height } };
  });
  await writeFile(info.outputPath("er-example.json"), JSON.stringify(artifact));
  await writeFile(info.outputPath("er-example.png"), Buffer.from(artifact.preview.dataUrl.split(",")[1]!, "base64"));
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await page.getByRole("button", { name: "编辑字段", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑实体字段", exact: true });
  await dialog.getByRole("textbox", { name: "实体名称", exact: true }).fill("客户档案");
  await dialog.getByRole("button", { name: "添加字段", exact: true }).click();
  await dialog.getByRole("textbox", { name: "字段 4 名称", exact: true }).fill("team_id");
  await dialog.getByRole("textbox", { name: "字段 4 类型", exact: true }).fill("uuid");
  await dialog.getByRole("combobox", { name: "字段 4 键", exact: true }).click();
  await page.getByRole("option", { name: "FK 外键", exact: true }).click();
  await dialog.getByRole("button", { name: "上移字段 4", exact: true }).click();
  await dialog.getByRole("button", { name: "删除字段 2", exact: true }).click();
  await page.screenshot({ path: info.outputPath("entity-fields.png") });
  await dialog.getByRole("button", { name: "应用字段", exact: true }).click();
  await expect(dialog).toBeHidden();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes[0]).toMatchObject({ text: "客户档案", entity: { fields: [{ name: "id", key: "primary" }, { name: "team_id", key: "foreign" }, { name: "email", key: "none" }] } });
  await expect(page.locator(`.x6-node[data-cell-id="${after.nodes[0]!.id}"]`)).toContainText("team_id");
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  for (const drawing of ["standard", "sketch", "pencil"] as const) {
    const svg = await page.evaluate(async drawing => { const e = window.flowFixture.editor(); e.select([]); e.setDrawingStyle(drawing); return (await e.exportSvg()).svg; }, drawing);
    expect(svg).toContain("team_id"); expect(svg).toContain("FK");
    await writeFile(info.outputPath(`er-${drawing}.svg`), svg);
  }
  const saved = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "保存到本机", exact: true }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const restored = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(restored.nodes).toEqual(saved.nodes); expect(restored.edges).toEqual(saved.edges);
});

test("ER endpoints have previews, independent ends and guarded field drafts", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await page.getByRole("button", { name: "编辑字段", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑实体字段", exact: true });
  await dialog.getByRole("textbox", { name: "实体名称", exact: true }).fill("取消草稿");
  await dialog.getByRole("button", { name: "取消", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await page.getByRole("button", { name: "编辑字段", exact: true }).click();
  await page.evaluate(() => window.flowFixture.editor().setReadOnly(true)); await expect(dialog).toBeHidden();
  await page.evaluate(async () => { const e = window.flowFixture.editor(); e.setReadOnly(false); e.select([(await e.getDocument()).edges[0]!.id]); });
  await page.getByRole("button", { name: "连线设置", exact: true }).click(); await page.getByRole("menuitem", { name: "起点", exact: true }).hover();
  const option = page.getByRole("menuitemradio", { name: "起点 · ER · 0..1", exact: true });
  await expect(option.locator(".qk-flow-style-preview path").last()).toHaveAttribute("d", /M3 -6/); await option.click();
  let source = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(source.edges[0]!.style).toMatchObject({ sourceArrow: "er-zero-one", targetArrow: "er-zero-many" });
  await page.getByRole("button", { name: "连线设置", exact: true }).click(); await page.getByRole("menuitem", { name: "终点", exact: true }).hover();
  await page.getByRole("menuitemradio", { name: "终点 · ER · 1..N", exact: true }).click();
  source = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(source.edges[0]!.style).toMatchObject({ sourceArrow: "er-zero-one", targetArrow: "er-one-many" });
  const custom = source;
  await page.getByRole("button", { name: "连线设置", exact: true }).click(); await page.getByRole("menuitem", { name: "关系预设", exact: true }).hover();
  await page.getByRole("menuitemradio", { name: "ER · 多对多", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).edges[0]!.style).toMatchObject({ sourceArrow: "er-many", targetArrow: "er-many", dashed: false });
  await page.getByRole("button", { name: "撤销", exact: true }).click(); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(custom);
  await page.evaluate(() => window.flowFixture.editor().select([]));
  await page.screenshot({ path: info.outputPath("er-relations.png") });
});


test("field dialog stays usable in dark narrow layouts and refuses stale or composing drafts", async ({ page }, info) => {
  await setup(page); await page.getByRole("button", { name: "切换明暗主题" }).click();
  await page.setViewportSize({ width: 480, height: 780 });
  await page.getByRole("button", { name: "图形属性", exact: true }).click(); await page.getByRole("button", { name: "编辑字段", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "编辑实体字段", exact: true });
  await expect(dialog.getByRole("button", { name: "应用字段", exact: true })).toBeInViewport();
  const bounds = (await dialog.boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(480);
  const name = dialog.getByRole("textbox", { name: "实体名称", exact: true });
  await name.dispatchEvent("compositionstart"); await expect(dialog.getByRole("button", { name: "应用字段", exact: true })).toBeDisabled();
  await name.dispatchEvent("compositionend");
  await page.screenshot({ animations: "disabled", path: info.outputPath("entity-dark-narrow.png") });
  await page.evaluate(async () => { const e = window.flowFixture.editor(); e.setNodeStyle({ fontSize: 20 }); });
  await dialog.getByRole("button", { name: "应用字段", exact: true }).click(); await expect(dialog.getByRole("alert")).toContainText("图形已更新");
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
});
