import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { importMindMapText } from "@quirekit/mind-map/text";
test("Markdown and outline imports open immediately, export actual bytes and remain editable", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  for (const [extension, text] of [["md", "# 中文项目\n- 调研\n  - 收集资料\n- 开发"], ["txt", "中文项目\n  调研\n    收集资料\n  开发"]]) {
    await page.getByRole("button", { name: "模板与导入", exact: true }).click();
    await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({ name: `项目.${extension}`, mimeType: "text/plain", buffer: Buffer.from(text!) });
    await expect(page.locator(".qk-mind-editor__files")).toHaveCount(0); await expect(page.locator(".smm-node")).toHaveCount(4);
    await page.getByRole("button", { name: "导出", exact: true }).click();
    const received = page.waitForEvent("download"); await page.getByRole("menuitem", { name: extension === "md" ? "Markdown 大纲（.md）" : "文本大纲（.txt）", exact: true }).click();
    const download = await received, path = info.outputPath(`项目.${extension}`); await download.saveAs(path);
    const result = importMindMapText(await readFile(path, "utf8"), extension === "md" ? "markdown" : "outline");
    expect(result.document.root.children[0]!.children[0]!.text).toBe("收集资料");
    await page.getByRole("alertdialog").getByRole("button", { name: "返回编辑", exact: true }).click();
    await page.locator(".smm-node").filter({ hasText: /^开发$/ }).click(); await page.getByRole("button", { name: "新增子主题", exact: true }).click();
    await expect(page.locator(".smm-node")).toHaveCount(5); await page.getByRole("button", { name: "撤销", exact: true }).click(); await expect(page.locator(".smm-node")).toHaveCount(4);
  }
  await page.screenshot({ path: info.outputPath("text-import-editable.png") });
});
test("invalid indentation is a popup and cannot replace the original map", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("根\n    没有父主题") });
  await expect(page.getByRole("alertdialog")).toBeVisible(); await expect(page.locator(".smm-node")).toHaveCount(14);
});
