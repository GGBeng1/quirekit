import type { Locator, Page } from "@playwright/test";

/** @param page - Preview or host page. @param scope - Optional embedded workspace. @returns Open template gallery through the file menu. */
export async function openFlowTemplates(page: Page, scope: Page | Locator = page): Promise<void> {
  await scope.getByRole("button", { name: "图表", exact: true }).click();
  await page.getByRole("menuitem", { name: "从模板创建…", exact: true }).click();
}

/** @param page - Preview or host page. @param label - Gallery card. @param scope - Optional workspace. @returns Applied template through the real gallery. */
export async function chooseFlowTemplate(page: Page, label: string, scope: Page | Locator = page): Promise<void> {
  await openFlowTemplates(page, scope);
  const gallery = page.getByRole("dialog", { name: "选择图表模板", exact: true });
  await gallery.getByRole("button", { name: label, exact: true }).click();
  await gallery.getByRole("button", { name: "使用模板", exact: true }).click();
}

/** @param page - Preview or host page. @param scope - Optional workspace. @returns Open library from the diagram menu. */
export async function openFlowLibrary(page: Page, scope: Page | Locator = page): Promise<void> {
  await scope.getByRole("button", { name: "图表", exact: true }).click();
  await page.getByRole("menuitem", { name: "我的图形库…", exact: true }).click();
}

/** @param page - Preview page. @param tab - Existing guarded object editor. @param scope - Optional workspace. @returns Open the corresponding object tab. */
export async function openFlowObject(page: Page, tab: "shape" | "geometry", scope: Page | Locator = page): Promise<void> {
  await scope.getByRole("button", { name: "图形属性", exact: true }).click();
  await page.getByRole("tab", { name: tab === "shape" ? "更换形状" : "位置与尺寸", exact: true }).click();
}

/** @param page - Preview page. @param section - Visible line submenu. @returns Open the actual submenu, without executing model commands. */
export async function openFlowLine(page: Page, section: string): Promise<void> {
  await page.getByRole("button", { name: "连线设置", exact: true }).click();
  await page.getByRole("menuitem", { name: section, exact: true }).hover();
}

/** @param label - User-visible line option. @returns Its visible settings section. */
export function flowLineSection(label: string): string {
  if (label.startsWith("起点")) return "起点";
  if (label.startsWith("终点")) return "终点";
  if (label.startsWith("ER ·") || label.startsWith("UML ·")) return "关系预设";
  if (label.includes("px")) return "线宽";
  if (["实线", "虚线"].includes(label)) return "线型";
  if (["普通交叉", "跨线弧", "交叉处断开"].includes(label)) return "交叉处理";
  return ["直线", "直角折线", "圆角折线", "平滑曲线"].includes(label) ? "连线路径" : "常用箭头";
}

/** @param page - Preview page. @param label - Requested structural operation. @returns Open the appropriate professional diagram family. */
export async function openFlowStructure(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: "插入与结构", exact: true }).click();
  if (label !== "添加分层容器") await page.getByRole("menuitem", { name: /泳道|阶段/.test(label) ? "泳道" : "时序图", exact: true }).hover();
}

/** @param page - Preview page. @returns Open all alignment, distribution and size actions in one panel. */
export async function openFlowAlignment(page: Page): Promise<void> {
  await page.getByRole("button", { name: "对齐与尺寸", exact: true }).click();
}
