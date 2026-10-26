import { expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

/** @param page - Standalone whiteboard page. @param label - Visible language or appearance choice. */
export async function selectWhiteboardSetting(page: Page, label: "中文" | "English" | "浅色" | "深色" | "Light" | "Dark"): Promise<void> {
  const language = label === "中文" || label === "English";
  await page.getByRole("button", { name: language ? /^(界面语言|Interface language)[：:]/u : /^(外观|Appearance)[：:]/u }).click();
  await page.getByRole("menuitemradio", { name: label, exact: true }).click();
  await expect(page.getByRole("menu")).toBeHidden();
}

/** @param page - Product page with an open whiteboard. @param text - Native text input to retain. @param locale - Expected workspace language. */
export async function drawWhiteboard(page: Page, text = "共享白板测试", locale = "zh-CN"): Promise<void> {
  await page.getByRole("radio", { name: locale === "en" ? "Rectangle" : "矩形", exact: true }).locator("..").click();
  const bounds = (await page.locator("canvas.excalidraw__canvas.interactive").boundingBox())!;
  await page.mouse.move(bounds.x + 320, bounds.y + 150); await page.mouse.down();
  await page.mouse.move(bounds.x + 580, bounds.y + 290, { steps: 8 }); await page.mouse.up();
  await page.getByRole("radio", { name: locale === "en" ? "Text" : "文字", exact: true }).locator("..").click();
  await page.mouse.click(bounds.x + 350, bounds.y + 200); await page.keyboard.insertText(text);
}

/** @param page - Live workspace. @returns Native exported source, after flushing active input. */
export async function exportWhiteboard(page: Page): Promise<{ elements: { type: string; text?: string }[] }> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出可编辑文件", exact: true }).click();
  const download = await pending;
  return JSON.parse(await readFile((await download.path())!, "utf8"));
}

/** @param page - Product page. */
export async function saveWhiteboard(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "编辑白板", exact: true });
  await dialog.getByRole("button", { name: "保存白板", exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** @param page - Product page after reopening a saved board. */
export async function expectEditableWhiteboard(page: Page): Promise<void> {
  const scene = await exportWhiteboard(page);
  expect(scene.elements.some(element => element.type === "rectangle")).toBe(true);
  expect(scene.elements.some(element => element.type === "text" && element.text === "共享白板测试")).toBe(true);
}
