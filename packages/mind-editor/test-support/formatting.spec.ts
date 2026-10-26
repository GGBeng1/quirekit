import { toggleMindPreviewTheme } from "./preferences/testing";
import { expect, test, type Page } from "@playwright/test";

/** @param page - Active workspace. @param field - Accessible property name. @param value - Visible choice. @returns Selection completion. */
async function choose(page: Page, field: string, value: string): Promise<void> {
  await page.getByRole("combobox", { name: field, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}

test("shared property controls persist styles, mixed selection and theme resets", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click();
  await page.getByRole("button", { name: "主题格式", exact: true }).click();
  await choose(page, "字号", "24 px"); await choose(page, "字重", "粗体"); await choose(page, "节点形状", "椭圆");
  await choose(page, "子分支路径", "折线");
  await page.getByRole("button", { name: "文字颜色", exact: true }).click();
  await page.getByRole("button", { name: "#E5484D", exact: true }).click();
  // Choosing a palette swatch closes the public picker; another Escape would
  // close the property panel when WebKit completes that dismissal immediately.
  await page.getByRole("button", { name: "设为透明填充", exact: true }).click();
  await expect(nodes.filter({ hasText: /^本周计划$/ }).locator('path[d*="A"]').first()).toBeVisible();
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  const source = await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!));
  expect(source.version).toBe(3);
  expect(source.root.children[0].style).toMatchObject({ fontSize: 24, bold: true, color: "#e5484d", fill: "transparent", shape: "ellipse", lineStyle: "elbow" });
  await page.locator("[data-quirekit-mind-map]").focus(); await page.keyboard.press("ControlOrMeta+a");
  await expect(page.getByRole("combobox", { name: "字号", exact: true })).toContainText("混合");
  await choose(page, "字重", "常规");
  await expect(page.getByRole("combobox", { name: "字重", exact: true })).toContainText("常规");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await nodes.filter({ hasText: /^本周计划$/ }).click();
  await toggleMindPreviewTheme(page);
  const panel = page.getByRole("complementary", { name: "主题格式", exact: true });
  await expect(panel).toHaveCSS("color", "rgb(232, 237, 244)");
  await expect(page.locator("[data-icon-missing]")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("formatting-dark.png") });
  await page.getByRole("button", { name: "清除主题格式" }).click();
  await expect(page.getByRole("combobox", { name: "字号", exact: true })).toContainText("主题默认");
  await page.reload();
  await expect(nodes.filter({ hasText: /^本周计划$/ }).locator('path[d*="A"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("valid nonpreset values remain truthful in a narrow property panel", async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("quirekit-mind-editor-preview-v1", JSON.stringify({ version: 3, revision: 0, layout: "mind-map", floatingTopics: [],
      root: { id: "root", text: "自定义值", collapsed: false, children: [], style: { fontSize: 13, borderWidth: 1.75 } } }));
  });
  await page.setViewportSize({ width: 700, height: 620 }); await page.goto("/");
  await page.getByRole("button", { name: "主题格式", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "字号", exact: true })).toContainText("13 px");
  await expect(page.getByRole("combobox", { name: "边框粗细", exact: true })).toContainText("1.75 px");
  await page.screenshot({ path: info.outputPath("formatting-narrow.png") });
  await page.getByRole("button", { name: "关闭主题格式" }).click();
  await expect(page.locator("[data-quirekit-mind-map]")).toBeFocused();
});
