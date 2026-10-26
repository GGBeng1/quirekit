import { expect, test, type Page } from "@playwright/test";
import { drawWhiteboard } from "./helpers";

/** @param page - Product with an English whiteboard task already open. @returns Completed localized authoring and explicit host save. */
export async function saveEnglishWhiteboard(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Edit whiteboard", exact: true });
  await expect(dialog).toBeVisible();
  await drawWhiteboard(page, "保留内容 / Keep this drawing", "en");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("unsaved changes");
  await dialog.getByRole("button", { name: "Continue editing", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Export PNG image", exact: true })).toBeEnabled();
  await dialog.screenshot({ path: test.info().outputPath("whiteboard-dialog-english.png") });
  await dialog.getByRole("button", { name: "Save whiteboard", exact: true }).click();
  await expect(dialog).toBeHidden();
}
/** @param page - Product with its exact saved whiteboard selected. @returns Localized rename task completion. */
export async function renameEnglishWhiteboard(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Rename whiteboard", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Rename whiteboard", exact: true });
  await dialog.getByRole("textbox", { name: "Whiteboard name", exact: true }).fill("");
  await dialog.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(dialog).toContainText("Enter a name between 1 and 200 characters");
  await dialog.getByRole("textbox", { name: "Whiteboard name", exact: true }).fill("Language test / 语言测试");
  await dialog.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(dialog).toBeHidden();
}
