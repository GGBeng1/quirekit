import { expect, type Page, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { applyFlowchartTemplate, expectFlowchartTask } from "./host-helpers";

/** @param page - Real product host with the shared task open. @param info - Actual output artifacts. @returns Completion of application-font and direct-download acceptance. */
export async function exerciseHostPdf(page: Page, info: TestInfo): Promise<void> {
  await applyFlowchartTemplate(page, "系统架构设计"); const task = await expectFlowchartTask(page), count = await task.locator(".x6-node").count();
  await task.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "页面与打印…", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "页面与打印", exact: true }); await expect(panel.getByRole("button", { name: "下载 PDF", exact: true })).toBeEnabled();
  const pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "下载 PDF", exact: true }).click();
  const download = await pending, path = info.outputPath(`${info.project.name}-architecture.pdf`); await download.saveAs(path);
  expect((await readFile(path)).subarray(0, 4).toString()).toBe("%PDF");
  await panel.getByRole("contentinfo").getByRole("button", { name: "关闭", exact: true }).click();
  expect(await task.locator(".x6-node").count()).toBe(count); await task.getByRole("button", { name: "取消", exact: true }).click();
}
