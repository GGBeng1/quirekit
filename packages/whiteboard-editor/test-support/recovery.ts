import { expect, type Page } from "@playwright/test";
import { drawWhiteboard, exportWhiteboard, saveWhiteboard } from "./helpers";

/** @param page - Isolated product test page. @param open - Real product insertion action, reused after reload. @returns Saved recovered board after exercising the actual host binding. */
export async function recoverWhiteboardInsertion(page: Page, open: () => Promise<void>): Promise<void> {
  await open(); await drawWhiteboard(page, "三端刷新恢复验证");
  await expect(page.getByRole("status").filter({ hasText: "草稿已备份到本机" })).toBeVisible({ timeout: 15_000 });
  page.once("dialog", dialog => dialog.accept()); await page.reload();
  await open();
  const recovery = page.getByRole("region", { name: "本机草稿恢复" });
  await expect(recovery).toBeVisible();
  await expect(page.getByRole("button", { name: "保存白板", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
  await expect(recovery).toBeHidden();
  expect((await exportWhiteboard(page)).elements.some(element => element.text === "三端刷新恢复验证")).toBe(true);
  await saveWhiteboard(page);
  // The insertion slot must be cleared after commit; a later new board is clean.
  await open(); await expect(page.getByRole("button", { name: "保存白板", exact: true })).toBeEnabled();
  await expect(recovery).toBeHidden();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "编辑白板", exact: true })).toBeHidden();
}
