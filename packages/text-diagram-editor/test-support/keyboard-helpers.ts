import { expect, type Page } from "@playwright/test";
import { readDiagramSource, textDiagramTask } from "./host-helpers";

/** @param page - Host with a ready short source fixture. @param needle - Unique source word to replace. @param replacement - Valid replacement word. */
export async function checkDiagramKeyboard(page: Page, needle: string, replacement: string): Promise<void> {
  const task = await textDiagramTask(page), source = task.getByRole("textbox", { name: /^(源码|Source)$/u });
  const original = await readDiagramSource(source);
  await expect(task.locator(".cm-lineNumbers")).toBeVisible();
  await expect.poll(() => source.locator(".cm-line span[class]").count()).toBeGreaterThan(2);
  await source.press("ControlOrMeta+End");
  await source.pressSequentially("  ");
  await expect.poll(() => readDiagramSource(source)).toBe(original + "  ");
  await source.press("ControlOrMeta+z");
  await expect.poll(() => readDiagramSource(source)).toBe(original);
  await source.press("ControlOrMeta+Shift+z");
  await expect.poll(() => readDiagramSource(source)).toBe(original + "  ");
  await source.press("ControlOrMeta+z");
  await source.press("ControlOrMeta+a"); await source.press("Tab");
  await expect.poll(() => readDiagramSource(source)).toBe(original.split("\n").map(line => `  ${line}`).join("\n"));
  await source.press("Shift+Tab");
  await expect.poll(() => readDiagramSource(source)).toBe(original);
  await source.press("ControlOrMeta+f");
  const find = task.getByRole("textbox", { name: /^(查找|Find)$/u });
  await expect(find).toBeFocused();
  await find.fill(needle); await find.press("Enter");
  await task.getByRole("textbox", { name: /^(替换|Replace)$/u }).fill(replacement);
  await task.getByRole("button", { name: /^(全部替换|replace all)$/u }).click();
  await expect.poll(() => readDiagramSource(source)).toBe(original.replaceAll(needle, replacement));
  await source.press("ControlOrMeta+z");
  await expect.poll(() => readDiagramSource(source)).toBe(original);
  await source.press("Escape"); await expect(find).toHaveCount(0);
  await source.press("Escape"); await source.press("Tab");
  await expect(source).not.toBeFocused(); await expect(task).toBeVisible();
  await textDiagramTask(page);
}
