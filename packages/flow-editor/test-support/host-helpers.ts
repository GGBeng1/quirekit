import { chooseFlowTemplate, openFlowLibrary, openFlowObject, openFlowTemplates } from "./toolbar";
import { expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { FlowchartDocument } from "@quirekit/flowchart";

/** @param page - Real application. @returns Ready shared authoring task. */
export async function expectFlowchartTask(page: Page) {
  const dialog = page.getByRole("dialog", { name: "编辑流程图", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  return dialog;
}
/** @param page - Mounted application. @param label - Public template name. */
export async function applyFlowchartTemplate(page: Page, label: string): Promise<void> {
  const task = await expectFlowchartTask(page);
  await openFlowTemplates(page, task);
  const gallery = page.getByRole("dialog", { name: "选择图表模板", exact: true });
  await gallery.getByRole("group", { name: "模板列表" }).getByRole("button", { name: label, exact: true }).click();
  await expect(gallery.getByRole("img", { name: `${label}预览`, exact: true })).toBeVisible();
  await gallery.getByRole("button", { name: "使用模板", exact: true }).click();
  await expect(gallery).toBeHidden();
  await expect(task.locator(".qk-flow-editor__surface .x6-node").first()).toBeVisible();
}
/** @param page - Mounted task. */
export async function saveFlowchart(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "编辑流程图", exact: true });
  await dialog.getByRole("button", { name: "保存图形", exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** @param page - Actual Classic, Block or MSFE task. Creates and plays connector flow through the generic UI, without loading or replacing a diagram. */
export async function exerciseFlowPlayback(page: Page): Promise<void> {
  const task = await expectFlowchartTask(page), nodes = task.locator(".x6-node"), before = await nodes.count(), text = await task.locator(".x6-node text").allTextContents();
  const point = await task.locator(".x6-edge > path").first().evaluate(element => {
    const path = element as SVGPathElement, p = path.getPointAtLength(path.getTotalLength() / 2).matrixTransform(path.getScreenCTM()!); return { x: p.x, y: p.y };
  });
  await page.mouse.click(point.x, point.y);
  await task.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "演示模式…", exact: true }).click();
  await expect(task.getByRole("button", { name: /载入.*(动画|示例)/ })).toHaveCount(0);
  await task.getByRole("button", { name: "新增步骤", exact: true }).click();
  await expect(task.getByRole("combobox", { name: "动效", exact: true })).toContainText("流动虚线");
  await task.getByRole("textbox", { name: "步骤标题", exact: true }).fill("沿所选连线传递");
  await task.getByRole("combobox", { name: "流动方向", exact: true }).click(); await page.getByRole("option", { name: "反向", exact: true }).click();
  await task.getByRole("combobox", { name: "流动速度", exact: true }).click(); await page.getByRole("option", { name: "快速", exact: true }).click();
  await task.getByRole("button", { name: "添加步骤", exact: true }).click();
  await task.getByRole("button", { name: "播放演示", exact: true }).click(); await task.getByRole("button", { name: "暂停演示", exact: true }).click();
  const slider = task.getByRole("slider", { name: "步骤内预览", exact: true }); await slider.press("Home"); await slider.press("ArrowRight");
  await expect(task.locator('[data-flow-motion-flow][data-flow-style="dash"]')).toHaveCount(1);
  await expect(task.locator("[data-flow-motion-flow]")).toHaveAttribute("opacity", ".9");
  await expect(task.locator("[data-flow-run-target]")).toHaveCount(0);
  await task.getByRole("button", { name: "退出演示", exact: true }).click(); await expect(task.locator("[data-flow-authored-opacity]")).toHaveCount(0);
  await expect(nodes).toHaveCount(before); expect(await task.locator(".x6-node text").allTextContents()).toEqual(text);
}

/** @param page - Real Classic, Block or Markdown workspace. @param name - Per-host reusable template name. */
export async function roundtripFlowLibrary(page: Page, name: string): Promise<void> {
  const task = await expectFlowchartTask(page);
  await task.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "保存到图形库", exact: true }).hover();
  await page.getByRole("menuitem", { name: "整张图存为模板", exact: true }).click();
  const library = page.getByRole("dialog", { name: "我的图形库", exact: true });
  await library.getByRole("textbox", { name: "图形名称", exact: true }).fill(name);
  await library.getByRole("button", { name: "保存到图形库", exact: true }).click();
  await expect(library.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(library.getByAltText("所选图形预览")).toBeVisible();
  await library.getByRole("button", { name: "关闭", exact: true }).last().click();
  await chooseFlowTemplate(page, "空白流程图", task);
  await expect(task.locator(".qk-flow-editor__surface .x6-node")).toHaveCount(0);
  await openFlowLibrary(page, task);
  await library.getByRole("button", { name, exact: true }).click();
  await library.getByRole("button", { name: "使用模板", exact: true }).click();
  await expect(library).toBeHidden();
  await expect(task.locator(".qk-flow-editor__surface .x6-node").first()).toBeVisible();
}

/** @param page - One of the three real hosts. @param name - Unique persisted sample title. @returns Completion of the shared UI authoring workflow. */
export async function exercisePrecisionAuthoring(page: Page, name: string): Promise<void> {
  const task = await expectFlowchartTask(page);
  await exerciseFlowPlayback(page);
  await task.getByRole("button", { name: "插入处理", exact: true }).click();
  await task.getByRole("application", { name: "流程图编辑区", exact: true }).press("F2");
  await task.getByRole("textbox", { name: "图形文字", exact: true }).fill(name);
  await page.keyboard.press("ControlOrMeta+Enter");
  await task.getByRole("application", { name: "流程图编辑区" }).focus(); await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "位置与尺寸", exact: true }).click();
  const panel = page.getByRole("form", { name: "位置与尺寸", exact: true });
  for (const [label, value] of [["X 坐标", "1100"], ["Y 坐标", "120"], ["宽度", "180"], ["高度", "80"], ["旋转角度", "15"]] as const) {
    await panel.getByRole("spinbutton", { name: label, exact: true }).fill(value);
  }
  await panel.getByRole("button", { name: "应用属性", exact: true }).click(); await expect(panel).toBeHidden();
  await task.getByRole("application", { name: "流程图编辑区" }).focus();
  await page.keyboard.press("Shift+ArrowRight"); await page.keyboard.press("ArrowRight");
  await task.getByRole("button", { name: "插入与结构", exact: true }).click(); await page.getByRole("menuitem", { name: "向右添加相同图形", exact: true }).click();
  await task.getByRole("application", { name: "流程图编辑区", exact: true }).press("F2");
  await task.getByRole("textbox", { name: "图形文字", exact: true }).fill(`${name}接续`);
  await page.keyboard.press("ControlOrMeta+Enter");
  await exerciseFinishingAuthoring(page, name);
}

/** @param source - Saved host document, not an adapter draft. @param name - Unique authoring sample. */
export function expectPrecisionSource(source: FlowchartDocument, name: string): void {
  const first = source.nodes.find(n => n.text === name), next = source.nodes.find(n => n.text === `${name}接续`);
  expect(first).toMatchObject({ x: 1111, y: 120, width: 180, height: 80, rotation: 15 });
  expect(first!.style.bold).toBe(true);
  expect(next).toMatchObject({ shape: "hexagon", width: 180, height: 80, style: { bold: true } }); expect(next!.x).toBeGreaterThan(first!.x + first!.width);
  expect(source.edges).toContainEqual(expect.objectContaining({ source: expect.objectContaining({ node: first!.id }), target: expect.objectContaining({ node: next!.id }) }));
}

/** @param page - Actual host task. @param name - Persisted sample whose connected peer is currently selected. @returns Completion of replacement, format reuse, navigation and actual SVG download. */
async function exerciseFinishingAuthoring(page: Page, name: string): Promise<void> {
  const task = await expectFlowchartTask(page);
  await openFlowObject(page, "shape", task);
  await page.getByRole("button", { name: "更换为六边形", exact: true }).click();
  await task.getByRole("button", { name: "文字样式", exact: true }).click();
  const text = page.getByRole("form", { name: "图形文字属性", exact: true });
  await text.getByRole("button", { name: "加粗", exact: true }).click(); await text.getByRole("button", { name: "应用文字样式" }).click();
  await task.getByRole("button", { name: "格式复用", exact: true }).click(); await page.getByRole("menuitem", { name: "复制格式", exact: true }).click();
  await task.getByRole("button", { name: "查找图形", exact: true }).click();
  await task.getByRole("textbox", { name: "查找画布文字" }).fill(name);
  await task.getByRole("button", { name: `定位：${name}`, exact: true }).click();
  await task.getByRole("button", { name: "关闭查找" }).click();
  await task.getByRole("button", { name: "格式复用", exact: true }).click(); await page.getByRole("menuitem", { name: "粘贴格式", exact: true }).click();
  await task.getByRole("button", { name: "适应选区", exact: true }).click();
  await task.getByRole("button", { name: "画布缩略图", exact: true }).click();
  const overview = task.getByRole("button", { name: "缩略图定位画布，方向键平移，回车居中" });
  await expect(overview).toBeVisible(); await overview.press("ArrowRight"); await overview.press("Escape");
  await task.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "导出矢量图（SVG）…", exact: true }).click();
  const output = page.getByRole("dialog", { name: "导出图片", exact: true }); await output.getByText("当前选区", { exact: true }).click();
  await expect(output.getByRole("button", { name: "下载图片" })).toBeEnabled();
  const pending = page.waitForEvent("download"); await output.getByRole("button", { name: "下载图片" }).click();
  const svg = await readFile((await (await pending).path())!, "utf8"); expect(svg).toContain(name); expect(svg).not.toContain(`${name}接续`);
  await expect(output).toBeHidden();
}
