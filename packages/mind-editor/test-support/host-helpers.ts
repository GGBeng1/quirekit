import { expect, type Page } from "@playwright/test";

/** @param page - Mounted document host. @returns Ready shared mind map task. */
export async function expectMindMapTask(page: Page) {
  const task = page.getByRole("dialog", { name: "编辑思维导图", exact: true });
  await expect(task).toBeVisible();
  await expect(task.locator(".smm-node").first()).toBeVisible();
  await expect(task.getByRole("button", { name: "保存脑图", exact: true })).toBeEnabled();
  return task;
}

/** @param page - Mounted task. @param text - Literal replacement for the main topic. */
export async function editMindMapRoot(page: Page, text: string): Promise<void> {
  const task = await expectMindMapTask(page);
  await task.locator(".smm-node").first().dblclick();
  const input = page.locator('[contenteditable="true"]:visible').last();
  await input.fill(text);
  // Intentionally leave the text session open: Save must include this edit.
}

/** @param page - Mounted task. */
export async function saveMindMap(page: Page): Promise<void> {
  const task = await expectMindMapTask(page);
  await task.getByRole("button", { name: "保存脑图", exact: true }).click();
  await expect(task).toBeHidden();
}

/** @param page - Mounted task. @param layout - Shared v6 layout label. @returns Ready topic session after whole-map styling. */
export async function styleMindMap(page: Page, layout: "组织结构图" | "时间轴"): Promise<void> {
  const task = await expectMindMapTask(page);
  await task.getByRole("button", { name: "布局", exact: true }).click();
  await page.getByRole("menuitemradio", { name: layout, exact: true }).click();
  await task.getByRole("button", { name: "主题格式", exact: true }).click();
  await task.getByRole("button", { name: "海洋", exact: true }).click();
  await task.getByRole("button", { name: "关闭主题格式", exact: true }).click();
}
