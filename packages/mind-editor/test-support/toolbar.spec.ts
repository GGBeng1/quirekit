import { toggleMindPreviewTheme } from "./preferences/testing";
import { expect, test, type Page } from "@playwright/test";

/** @param page - Isolated editor page. @param menu - Visible toolbar group. @param label - Command label. @returns Completion of a real menu gesture. */
async function choose(page: Page, menu: string, label: string): Promise<void> {
  await page.getByRole("button", { name: menu, exact: true }).click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}

test("insert targets preserve field drafts, native focus and the actual image picker", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.locator(".smm-node").filter({ hasText: /^本周计划$/ }).click();
  await choose(page, "插入", "备注…");
  const note = page.getByRole("textbox", { name: "主题备注", exact: true });
  await expect(note).toBeFocused(); await note.fill("菜单直达的草稿");
  await choose(page, "插入", "链接…");
  const link = page.getByRole("textbox", { name: "主题链接", exact: true });
  await expect(link).toBeFocused(); await expect(note).toHaveValue("菜单直达的草稿");
  await link.fill("https://example.com/plan");
  await choose(page, "插入", "优先级…");
  const priority = page.getByRole("combobox", { name: "优先级标记", exact: true });
  await expect(priority).toBeFocused();
  await priority.click(); await page.getByRole("option", { name: "优先级 1", exact: true }).click();
  await page.getByRole("button", { name: "应用主题内容", exact: true }).click();
  await page.getByRole("button", { name: "插入", exact: true }).click();
  const picker = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "图片…", exact: true }).click();
  await (await picker).setFiles({ name: "mark.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64") });
  await expect(page.locator(".smm-node image")).toHaveCount(1);
  await expect(note).toHaveValue("菜单直达的草稿");
  await page.getByRole("button", { name: "关闭主题内容", exact: true }).click();
  await expect(page.locator("[data-quirekit-mind-map]")).toBeFocused();
  await page.getByRole("button", { name: "插入", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "插入父主题" }).locator("kbd")).toBeVisible();
  await expect(page.locator("[data-icon-missing]")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("insert-menu.png") });
  expect(errors).toEqual([]);
});

test("insert creates the selected relationship once and editing its caption remains undoable", async ({ page }) => {
  await page.goto("/"); const nodes = page.locator(".smm-node"); await expect(nodes).toHaveCount(14);
  await nodes.filter({ hasText: /^本周计划$/ }).click();
  await page.getByRole("button", { name: "插入", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "关联线", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await nodes.filter({ hasText: /^周工作总结$/ }).click({ modifiers: ["Shift"] });
  await choose(page, "插入", "关联线");
  await expect(page.locator('[data-qk-mind-annotation][data-kind="relation"]')).toHaveCount(1);
  const caption = page.getByRole("textbox", { name: "标注标题", exact: true });
  await expect(caption).toHaveValue("关联线"); await caption.fill("计划与复盘");
  await page.getByRole("button", { name: "应用标注", exact: true }).click();
  await expect(page.locator("[data-qk-mind-annotation]")).toContainText("计划与复盘");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator("[data-qk-mind-annotation]")).toContainText("关联线");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator("[data-qk-mind-annotation]")).toHaveCount(0);
  await choose(page, "插入", "外框");
  await expect(page.locator('[data-qk-mind-annotation][data-kind="boundary"]')).toHaveCount(1);
});

test("stable groups and panel toggles stay reachable through narrow dark overflow", async ({ page }, info) => {
  await page.goto("/"); await expect(page.locator(".smm-node")).toHaveCount(14);
  const format = page.getByRole("button", { name: "主题格式", exact: true });
  await format.click(); await expect(format).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "关闭主题格式", exact: true }).click();
  await expect(format).toHaveAttribute("aria-pressed", "false");
  await page.setViewportSize({ width: 680, height: 650 });
  await toggleMindPreviewTheme(page);
  await expect(page.getByRole("button", { name: "新增子主题", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "新增同级主题", exact: true })).toBeVisible();
  const more = page.getByRole("button", { name: "更多", exact: true });
  await more.click();
  await page.getByRole("button", { name: "布局", exact: true }).click();
  await expect(page.getByRole("menuitemradio", { name: "思维导图", exact: true })).toBeVisible();
  await page.getByRole("menuitemradio", { name: "逻辑图（向左）", exact: true }).click();
  await page.keyboard.press("Escape");
  await more.click(); await page.getByRole("button", { name: "视图", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: /^查找与大纲/ }).click();
  await expect(page.getByRole("textbox", { name: "查找主题", exact: true })).toBeFocused();
  await expect(page.getByRole("dialog", { name: "更多", exact: true })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(680);
  await page.screenshot({ path: info.outputPath("toolbar-narrow-dark.png") });
});
