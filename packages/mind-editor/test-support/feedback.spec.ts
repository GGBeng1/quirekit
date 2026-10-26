import { expect, test } from "@playwright/test";

test("file errors use a dialog without resizing the canvas or losing the import entry", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const surface = page.locator(".qk-mind-editor__surface");
  const bounds = await surface.boundingBox();
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  const trigger = page.getByRole("button", { name: "导入脑图或大纲", exact: true });
  await trigger.focus();
  await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({
    name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"version":99}'),
  });
  const error = page.getByRole("alertdialog", { name: "导入失败", exact: true });
  await expect(error).toBeVisible();
  await expect(error).toContainText("无法读取文件");
  expect(await surface.boundingBox()).toEqual(bounds);
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.screenshot({ path: info.outputPath("import-error-dialog.png") });
  await page.keyboard.press("Escape");
  await expect(error).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("complementary", { name: "模板与导入", exact: true })).toBeVisible();
  expect(await surface.boundingBox()).toEqual(bounds);
});

test("topic errors preserve the form draft and return focus without moving the viewport", async ({ page }) => {
  await page.goto("/"); const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).click(); await page.getByRole("menuitem", { name: "图片、链接与备注…", exact: true }).click();
  const link = page.getByRole("textbox", { name: "主题链接", exact: true });
  await link.fill("javascript:alert(1)");
  const apply = page.getByRole("button", { name: "应用主题内容", exact: true });
  const bounds = await page.locator(".qk-mind-editor__surface").boundingBox();
  const root = await nodes.filter({ hasText: /^时间管理$/ }).boundingBox();
  await apply.click();
  const error = page.getByRole("alertdialog", { name: "操作未完成", exact: true });
  await expect(error).toBeVisible();
  expect(await page.locator(".qk-mind-editor__surface").boundingBox()).toEqual(bounds);
  await error.getByRole("button", { name: "知道了", exact: true }).click();
  await expect(error).toBeHidden(); await expect(apply).toBeFocused();
  await expect(link).toHaveValue("javascript:alert(1)");
  expect(await nodes.filter({ hasText: /^时间管理$/ }).boundingBox()).toEqual(root);
  await link.fill("https://example.com"); await apply.click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  const source = await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!));
  expect(source.root.children[0].details.link).toBe("https://example.com");
});

test("successful imports use a temporary toast without taking focus or canvas space", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const surface = page.locator(".qk-mind-editor__surface");
  const bounds = await surface.boundingBox();
  await page.getByRole("button", { name: "模板与导入", exact: true }).click();
  await page.getByLabel("导入脑图文件", { exact: true }).setInputFiles({ name: "计划.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([{ title: "新计划", rootTopic: { title: "新计划" } }])) });
  await expect(page.getByText("已导入：新计划", { exact: true })).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(surface.locator("[data-quirekit-mind-map]")).toBeFocused();
  expect(await surface.boundingBox()).toEqual(bounds);
  await page.screenshot({ path: info.outputPath("import-success-toast.png") });
  await page.keyboard.press("Tab"); await expect(page.locator(".smm-node")).toHaveCount(2);
  await expect(page.getByText("已导入：新计划", { exact: true })).toBeHidden({ timeout: 5000 });
  expect(await surface.boundingBox()).toEqual(bounds);
});

test("command failures are dismissible dialogs and restore canvas keyboard ownership", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error("无法创建下载文件"); }; });
  await page.getByRole("button", { name: "导出", exact: true }).click();
  await page.getByRole("menuitem", { name: "脑图文件（JSON）", exact: true }).click();
  const error = page.getByRole("alertdialog", { name: "操作未完成", exact: true });
  await expect(error).toContainText("无法创建下载文件");
  await page.keyboard.press("Escape"); await expect(error).toBeHidden();
  await expect(page.locator(".qk-mind-editor__surface [data-quirekit-mind-map]")).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.locator(".smm-node")).toHaveCount(15);
});
