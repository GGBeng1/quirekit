import { expect, test } from "@playwright/test";

test("shared layout menu tracks undo and saved source after reopening", async ({ page }, info) => {
  const failures: string[] = []; page.on("pageerror", error => failures.push(error.message));
  await page.goto("/");
  await expect(page.locator(".smm-node")).toHaveCount(14);
  const layout = page.getByRole("button", { name: "布局", exact: true });
  await expect(layout).toContainText("布局");
  await layout.click();
  await expect(page.getByRole("menuitemradio", { name: "思维导图", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: "逻辑图（向右）", exact: true }).click();
  await expect(layout).toContainText("布局");
  await layout.click(); await expect(page.getByRole("menuitemradio", { name: "逻辑图（向右）", exact: true })).toHaveAttribute("aria-checked", "true"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(layout).toContainText("布局");
  await layout.click(); await expect(page.getByRole("menuitemradio", { name: "思维导图", exact: true })).toHaveAttribute("aria-checked", "true"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(layout).toContainText("布局");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  await page.reload(); await expect(layout).toContainText("布局");
  await layout.click(); await expect(page.getByRole("menuitemradio", { name: "逻辑图（向右）", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: info.outputPath("layout-toolbar.png") });
  expect(failures).toEqual([]);
});

test("native subtree paste updates toolbar state and survives local save/reopen", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.locator(".smm-node").filter({ hasText: /^本周计划$/ }).click();
  await page.keyboard.press("ControlOrMeta+c");
  await page.keyboard.press("Home"); await page.keyboard.press("ControlOrMeta+v");
  await expect(page.locator(".smm-node")).toHaveCount(18);
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: /^删除主题/ })).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  await page.reload(); await expect(page.locator(".smm-node")).toHaveCount(18);
  await expect(page.locator(".smm-node").filter({ hasText: /^本周计划$/ })).toHaveCount(2);
});
