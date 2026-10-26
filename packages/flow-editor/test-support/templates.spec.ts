import { openFlowTemplates } from "./toolbar";
import { expect, test } from "@playwright/test";
import type {} from "./types";

test("gallery previews real editable templates without changing the document until apply", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await openFlowTemplates(page);
  const dialog = page.getByRole("dialog", { name: "选择图表模板" }), list = dialog.getByRole("group", { name: "模板列表" });
  await expect(list.getByRole("button")).toHaveCount(31);
  await expect(list.locator("img")).toHaveCount(30);
  await expect.poll(() => list.locator("img").evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(page.locator(".qk-flow-templates__renderer [role=application]")).toHaveCount(0);
  await list.getByRole("button", { name: "应用架构", exact: true }).click();
  await expect(dialog.getByRole("img", { name: "应用架构预览" })).toBeVisible();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.screenshot({ path: info.outputPath("templates-light.png") });
  await dialog.getByRole("button", { name: "放大预览", exact: true }).click();
  await expect(dialog.getByRole("img", { name: "应用架构放大预览", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("template-enlarged.png") });
  await dialog.getByRole("button", { name: "返回模板", exact: true }).click();
  await dialog.getByRole("button", { name: "数据处理", exact: true }).click();
  await expect(list.getByRole("button")).toHaveCount(4);
  await dialog.getByRole("textbox", { name: "搜索模板" }).fill("数据清洗");
  await expect(list.getByRole("button")).toHaveCount(1);
  await list.getByRole("button", { name: "数据清洗", exact: true }).click();
  await dialog.getByRole("textbox", { name: "搜索模板" }).fill("没有这个模板");
  await expect(dialog.getByText("没有匹配的模板，试试其他关键词。", { exact: true })).toBeVisible();
  await dialog.getByRole("textbox", { name: "搜索模板" }).fill("");
  await page.keyboard.press("Escape"); await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);

  await openFlowTemplates(page);
  await list.getByRole("button", { name: "项目时间轴", exact: true }).click();
  await dialog.getByRole("button", { name: "使用模板", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("application", { name: "流程图编辑区" })).toBeFocused();
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes.some(node => node.shape === "text" && node.text === "项目里程碑")).toBe(true);
  expect(after.nodes.filter(node => node.shape === "arrow-right")).toHaveLength(4);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机" }).click(); await page.reload();
  await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(after.nodes);
});

test("template preview lifetime cancels cleanly and remains usable in dark and narrow layouts", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.evaluate(() => {
    const create = URL.createObjectURL, revoke = URL.revokeObjectURL, active = new Set<string>();
    URL.createObjectURL = blob => { const url = create(blob); active.add(url); return url; };
    URL.revokeObjectURL = url => { active.delete(url); revoke(url); };
    Object.assign(window, { activeTemplateUrls: () => active.size });
  });
  await openFlowTemplates(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(".qk-flow-templates__renderer")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { activeTemplateUrls(): number }).activeTemplateUrls())).toBe(0);
  await page.getByRole("button", { name: "切换明暗主题" }).click();
  await openFlowTemplates(page);
  const dialog = page.getByRole("dialog", { name: "选择图表模板" });
  await dialog.getByRole("button", { name: "手绘 · 从灵感到落地", exact: true }).click();
  await expect(dialog.getByRole("img", { name: "手绘 · 从灵感到落地预览" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("templates-dark.png") });
  await page.setViewportSize({ width: 480, height: 760 });
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(480);
  await expect(dialog.getByRole("button", { name: "使用模板" })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("templates-narrow.png") });
  // A host permission change is external to the modal, so use the existing
  // fixture rather than clicking through its inert backdrop.
  await page.evaluate(() => window.flowFixture.editor().setReadOnly(true));
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "图表", exact: true }).click(); await expect(page.getByRole("menuitem", { name: "从模板创建…", exact: true })).toHaveAttribute("aria-disabled", "true");
  expect(await page.evaluate(() => (window as unknown as { activeTemplateUrls(): number }).activeTemplateUrls())).toBe(0);
  expect(errors).toEqual([]);
});
