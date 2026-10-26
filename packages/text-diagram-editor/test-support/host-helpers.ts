import { expect, type Locator, type Page } from "@playwright/test";

/** @param source - CodeMirror textbox containing a short, fully rendered test fixture. @returns Visible source lines; large documents must be checked through host persistence. */
export async function readDiagramSource(source: Locator): Promise<string> {
  await expect(source).toBeVisible();
  return (await source.locator(".cm-line").allTextContents()).join("\n");
}

/** @param page - Any host with the shared workspace open. @returns The source editor after its first successful preview. */
export async function textDiagramTask(page: Page): Promise<Locator> {
  const task = page.getByRole("dialog", { name: /^(文本绘图|Text diagram)$/u });
  await expect(task.locator("[data-qk-text-diagram-editor]")).toBeVisible();
  await expect(task.getByRole("button", { name: /^(保存图形|Save diagram)$/u })).toBeEnabled({ timeout: 30_000 });
  return task;
}
/** @param page - Mounted task. @param name - Visible grammar name. @returns Ready shared workspace. */
export async function chooseTextDiagramLanguage(page: Page, name: "Mermaid" | "PlantUML" | "Graphviz / DOT"): Promise<Locator> {
  const task = await textDiagramTask(page);
  await task.getByRole("combobox", { name: /^(绘图语言|Language)$/u }).click();
  await page.getByRole("option", { name, exact: true }).click();
  return textDiagramTask(page);
}
/** @param page - Mounted task. @param name - Visible localized template. @param count - Expected catalog size for this grammar. @returns Ready preview after explicit template application. */
export async function chooseTextDiagramTemplate(page: Page, name: string, count: number): Promise<Locator> {
  const task = await textDiagramTask(page), source = task.getByRole("textbox", { name: /^(源码|Source)$/u });
  const previous = await readDiagramSource(source);
  await task.getByRole("combobox", { name: /^(模板|Template)$/u }).click();
  await expect(page.getByRole("option")).toHaveCount(count);
  await page.getByRole("option", { name, exact: true }).click();
  await expect.poll(() => readDiagramSource(source)).toBe(previous);
  await task.getByRole("button", { name: /^(应用模板|Apply template)$/u }).click();
  return textDiagramTask(page);
}
/** @param page - Mounted task. */
export async function saveTextDiagram(page: Page): Promise<void> {
  const task = await textDiagramTask(page);
  await task.getByRole("button", { name: /^(保存图形|Save diagram)$/u }).click();
  await expect(task).toHaveCount(0);
}
