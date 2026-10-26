import { toggleMindPreviewTheme } from "./preferences/testing";
import { expect, test } from "@playwright/test";

test("find reveals folded topics once, keeps search focus and restores folding on undo", async ({ page }, info) => {
  const failures: string[] = []; page.on("pageerror", error => failures.push(error.message));
  await page.goto("/");
  const nodes = page.locator(".smm-node"), canvas = page.locator("[data-quirekit-mind-map]");
  await expect(nodes).toHaveCount(14);
  await page.getByRole("button", { name: "视图", exact: true }).click();
  await page.getByRole("menuitem", { name: "全部折叠", exact: true }).click();
  await expect(nodes).toHaveCount(5);
  await canvas.focus();
  await page.keyboard.press("ControlOrMeta+f");
  const input = page.getByRole("textbox", { name: "查找主题" });
  await expect(input).toBeFocused();
  await input.fill("专注");
  const result = page.getByRole("button", { name: /安排专注工作时间/ });
  await expect(result).toContainText("折叠内容");
  await input.press("Enter");
  await expect(nodes).toHaveCount(8);
  await expect(input).toBeFocused();
  await expect(result).toHaveAttribute("aria-current", "true");
  await expect(result).not.toContainText("折叠内容");
  await page.screenshot({ path: info.outputPath("find-folded-topic.png") });
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(nodes).toHaveCount(5);
  await expect(result).toContainText("折叠内容");
  await input.fill("");
  const tree = page.getByRole("tree", { name: "脑图大纲" });
  await expect(tree).toBeVisible();
  await tree.getByText("本周计划", { exact: true }).click();
  await expect(nodes).toHaveCount(5);
  await input.focus(); await input.press("Escape");
  await expect(page.getByRole("complementary", { name: "查找与大纲" })).not.toBeVisible();
  await expect(canvas).toBeFocused();
  expect(failures).toEqual([]);
});

test("outline reflects new free topics, searches literal text and fits a narrow dark workspace", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "视图", exact: true }).click(); await page.getByRole("menuitemcheckbox", { name: /^查找与大纲/ }).click();
  await page.getByRole("button", { name: "插入", exact: true }).click(); await page.getByRole("menuitem", { name: "自由主题", exact: true }).click();
  const input = page.getByRole("textbox", { name: "查找主题" });
  await expect(page.getByRole("tree")).toContainText("自由主题");
  await input.fill("主题");
  await input.press("Shift+Enter");
  await expect(page.getByRole("button", { name: "自由主题", exact: true })).toHaveAttribute("aria-current", "true");
  await input.fill("[");
  await expect(page.getByText("没有匹配主题", { exact: true })).toBeVisible();
  await input.fill("");
  await page.setViewportSize({ width: 700, height: 650 });
  await toggleMindPreviewTheme(page);
  const panel = page.getByRole("complementary", { name: "查找与大纲" });
  await expect(panel).toBeVisible();
  await expect(panel.locator("[data-icon-missing]")).toHaveCount(0);
  await expect(panel.locator(".qk-tree-view__label").first()).toHaveCSS("color", "rgb(232, 237, 244)");
  expect((await panel.boundingBox())!.width).toBeLessThanOrEqual(300);
  await page.screenshot({ path: info.outputPath("outline-narrow-dark.png") });
  await page.getByRole("button", { name: "关闭查找与大纲" }).click();
  await page.locator(".smm-node").filter({ hasText: /^时间管理$/ }).dblclick();
  const native = page.locator('[contenteditable="true"]');
  await native.dispatchEvent("compositionstart", { data: "" });
  await native.dispatchEvent("keydown", { key: "f", ctrlKey: true, isComposing: true, bubbles: true });
  await expect(panel).not.toBeVisible();
  await native.dispatchEvent("compositionend", { data: "" });
  await native.press("Enter");
});

test("search bounds rendered results and navigates the final match backwards", async ({ page }) => {
  await page.addInitScript(() => {
    const children = Array.from({ length: 205 }, (_, index) => ({ id: `child-${index}`, text: `查找项 ${index}`, collapsed: false, children: [] }));
    localStorage.setItem("quirekit-mind-editor-preview-v1", JSON.stringify({ version: 1, revision: 0, layout: "mind-map",
      root: { id: "root", text: "分页", collapsed: false, children } }));
  });
  await page.goto("/");
  await expect(page.locator(".smm-node")).toHaveCount(206);
  await page.getByRole("button", { name: "视图", exact: true }).click(); await page.getByRole("menuitemcheckbox", { name: /^查找与大纲/ }).click();
  const input = page.getByRole("textbox", { name: "查找主题" });
  await input.fill("查找项");
  await expect(page.locator(".qk-mind-editor__results li")).toHaveCount(100);
  await input.press("Shift+Enter");
  await expect(page.locator(".qk-mind-editor__results li")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "查找项 204", exact: true })).toHaveAttribute("aria-current", "true");
  await input.press("Enter");
  await expect(page.locator(".qk-mind-editor__results li")).toHaveCount(100);
  await expect(page.getByRole("button", { name: "查找项 0", exact: true })).toHaveAttribute("aria-current", "true");
});
