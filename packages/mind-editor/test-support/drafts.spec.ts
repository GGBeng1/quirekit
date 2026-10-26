import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/** @param page - Isolated test workspace. @returns Open content form. */
async function content(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
}

test("switching topics and closing a panel preserve drafts through direct save and reopen", async ({ page }) => {
  await page.goto("/"); const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click(); await content(page);
  await page.getByRole("textbox", { name: "主题备注", exact: true }).fill("本周的草稿");
  await nodes.filter({ hasText: /^周工作总结$/ }).click();
  await expect(page.getByRole("textbox", { name: "主题备注", exact: true })).toHaveValue("");
  await page.getByRole("textbox", { name: "主题备注", exact: true }).fill("总结的草稿");
  await page.getByRole("button", { name: "关闭主题内容", exact: true }).click();
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  await page.reload(); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click(); await content(page);
  await expect(page.getByRole("textbox", { name: "主题备注", exact: true })).toHaveValue("本周的草稿");
  await nodes.filter({ hasText: /^周工作总结$/ }).click();
  await expect(page.getByRole("textbox", { name: "主题备注", exact: true })).toHaveValue("总结的草稿");
});

test("annotation captions survive closing without Apply and a single undo restores the accepted caption", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("menuitem", { name: "关联线、概要与外框…", exact: true }).click();
  await page.getByRole("button", { name: "添加外框", exact: true }).click();
  await page.getByRole("textbox", { name: "标注标题", exact: true }).fill("无需应用也能保留");
  await page.getByRole("button", { name: "关闭关联线、概要与外框", exact: true }).click();
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.locator("[data-qk-mind-annotation]")).toContainText("无需应用也能保留");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator("[data-qk-mind-annotation]")).toContainText("外框");
});

test("host Save commits a still-focused property field into the same source and preview", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.evaluate(async ({ dialogUrl, modelUrl }) => {
    const { openMindMapDialog } = await import(dialogUrl), { createMindMapEmbed } = await import(modelUrl);
    openMindMapDialog({ ownerDocument: document, request: { document: createMindMapEmbed("draft-save"),
      commit: (value: unknown) => { Object.assign(window, { savedMindDraft: value }); return "saved"; }, release() {} } });
  }, { dialogUrl: `/@fs${fileURLToPath(new URL("../src/runtime/dialog.ts", import.meta.url))}`,
    modelUrl: `/@fs${fileURLToPath(new URL("../../mind-map/src/index.ts", import.meta.url))}` });
  const dialog = page.getByRole("dialog", { name: "编辑思维导图", exact: true });
  await dialog.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
  await dialog.getByRole("textbox", { name: "主题备注", exact: true }).fill("外层直接保存");
  await dialog.getByRole("button", { name: "保存脑图", exact: true }).click();
  await expect(dialog).toBeHidden();
  const saved = await page.evaluate(() => (window as unknown as { savedMindDraft: { document: { source: string } } }).savedMindDraft);
  expect(JSON.stringify(saved)).toContain("外层直接保存");
});

test("native deletion commits captured fields first so undo restores the complete branch", async ({ page }) => {
  await page.goto("/"); const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click(); await content(page);
  await page.getByRole("textbox", { name: "主题备注", exact: true }).fill("删除前的备注");
  await nodes.filter({ hasText: /^本周计划$/ }).click(); await page.keyboard.press("Delete");
  await expect(nodes).toHaveCount(10);
  await page.keyboard.press("ControlOrMeta+z"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click();
  await expect(page.getByRole("textbox", { name: "主题备注", exact: true })).toHaveValue("删除前的备注");
});

test("native copy projects pending property fields synchronously into its portable fragment", async ({ page }) => {
  await page.goto("/"); const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click(); await content(page);
  await page.getByRole("textbox", { name: "主题备注", exact: true }).fill("复制中的草稿");
  await nodes.filter({ hasText: /^本周计划$/ }).click();
  // Native copy data is write-only in Firefox; verify the portable fragment by
  // pasting it, rather than reading back the copy event's DataTransfer.
  await page.keyboard.press("ControlOrMeta+c");
  await page.keyboard.press("Home"); await page.keyboard.press("ControlOrMeta+v");
  await expect(nodes).toHaveCount(18);
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  const copies = await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!).root.children
    .filter((node: { text: string }) => node.text === "本周计划")
    .map((node: { details?: { note?: string } }) => node.details?.note));
  expect(copies).toEqual(["复制中的草稿", "复制中的草稿"]);
});
