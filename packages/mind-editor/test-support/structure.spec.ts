import { toggleMindPreviewTheme } from "./preferences/testing";
import { expect, test, type Page } from "@playwright/test";

/** @param page - Live editor. @returns Explicitly saved portable document. */
async function savedSource(page: Page) {
  await page.getByRole("button", { name: /保存到本机/ }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  return page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-mind-editor-preview-v1")!));
}

test("right-click selects its topic, wraps a parent once and keeps keyboard editing after undo", async ({ page }, info) => {
  const failures: string[] = []; page.on("pageerror", error => failures.push(error.message));
  await page.goto("/");
  const nodes = page.locator(".smm-node"), branch = nodes.filter({ hasText: /^本周计划$/ });
  await expect(nodes).toHaveCount(14);
  await branch.click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "插入父主题" })).toBeEnabled();
  const context = page.locator("[data-qk-context-menu-content]");
  await expect(context.locator("kbd.qk-kbd--xs")).toHaveCount(5);
  expect(await context.getByRole("menuitem").evaluateAll(items => items.every(item => !!item.querySelector(".qk-menu__indicator .qk-icon svg")))).toBe(true);
  const keycap = context.locator("kbd").first();
  await expect(keycap).not.toHaveCSS("border-top-width", "0px");
  await page.screenshot({ path: info.outputPath("topic-context.png") });
  await page.getByRole("menuitem", { name: "插入父主题" }).click();
  await expect(nodes).toHaveCount(15);
  const source = await savedSource(page);
  expect(source.root.children[0].text).toBe("父主题");
  expect(source.root.children[0].children[0].id).toBe("week");
  expect(source.root.children[0].children[0].children).toHaveLength(3);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(nodes).toHaveCount(14);
  await branch.click();
  await page.keyboard.press("Shift+F10");
  await expect(page.getByRole("menuitem", { name: "插入父主题" })).toBeVisible();
  // Pointer highlighting queues menu focus; dismissal must settle that frame before
  // returning to the canvas, otherwise subsequent structure shortcuts disappear.
  await page.getByRole("menuitem", { name: "插入父主题" }).hover();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-quirekit-mind-map]")).toBeFocused();
  await page.keyboard.press("Shift+Enter");
  await expect(nodes).toHaveCount(15);
  expect(failures).toEqual([]);
});

test("semantic creation glyphs and complete context rows fit narrow and dark workspaces", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "插入", exact: true }).click();
  const buttons = [page.getByRole("button", { name: "新增子主题", exact: true }), page.getByRole("button", { name: "新增同级主题", exact: true }), page.getByRole("menuitem", { name: "自由主题", exact: true })];
  const glyphs = await Promise.all(buttons.map(button => button.locator("svg").innerHTML()));
  expect(new Set(glyphs).size).toBe(3);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 740, height: 650 });
  await toggleMindPreviewTheme(page);
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.locator(".smm-node").filter({ hasText: /^本周计划$/ }).click({ button: "right" });
  const context = page.locator("[data-qk-context-menu-content]");
  await expect(context).toBeVisible();
  expect(await context.locator(".qk-menu__label").evaluateAll(labels => labels.every(label => label.scrollWidth <= label.clientWidth))).toBe(true);
  const bounds = (await context.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(740);
  await page.screenshot({ path: info.outputPath("context-dark-narrow.png") });
});

test("indent, outdent, side-aware reorder and recursive folding survive save/reopen", async ({ page }) => {
  await page.goto("/");
  const nodes = page.locator(".smm-node");
  await nodes.filter({ hasText: /^周工作总结$/ }).click();
  await page.keyboard.press("Alt+Shift+ArrowRight");
  let source = await savedSource(page);
  expect(source.root.children.map((node: { id: string }) => node.id)).toEqual(["week", "next", "personal"]);
  expect(source.root.children[0].children.at(-1).id).toBe("summary");
  await nodes.filter({ hasText: /^周工作总结$/ }).click();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Alt+Shift+ArrowUp");
  source = await savedSource(page);
  expect(source.root.children.map((node: { id: string }) => node.id)).toEqual(["summary", "week", "next", "personal"]);
  expect(source.root.children[0].side).toBe("right");
  await page.getByRole("button", { name: "视图", exact: true }).click();
  await page.getByRole("menuitem", { name: "全部折叠", exact: true }).click();
  await expect(nodes).toHaveCount(5);
  source = await savedSource(page);
  expect(source.root.collapsed).toBe(false);
  expect(source.root.children.every((node: { collapsed: boolean }) => node.collapsed)).toBe(true);
  await page.reload();
  await expect(nodes).toHaveCount(5);
  await page.getByRole("button", { name: "视图", exact: true }).click();
  await page.getByRole("menuitem", { name: "全部展开", exact: true }).click();
  await expect(nodes).toHaveCount(14);
});

test("context menu preserves multi-selection and native input ownership", async ({ page }) => {
  await page.goto("/");
  const root = page.locator(".smm-node").filter({ hasText: /^时间管理$/ });
  await root.click();
  await page.keyboard.press("ControlOrMeta+a");
  await root.click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "插入父主题" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(".qk-mind-editor__hint")).toContainText("已选 14 个主题");
  await page.keyboard.press("Escape");
  await root.dblclick();
  const input = page.locator('[contenteditable="true"]');
  await input.dispatchEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 });
  await expect(page.locator("[data-qk-context-menu-content]")).not.toBeVisible();
  await input.dispatchEvent("compositionstart", { data: "" });
  await page.locator(".qk-mind-editor__surface").dispatchEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 });
  await expect(page.locator("[data-qk-context-menu-content]")).not.toBeVisible();
  await input.dispatchEvent("compositionend", { data: "" });
  await input.press("Enter");
  const canvas = (await page.locator("[data-quirekit-mind-map]").boundingBox())!;
  await page.mouse.click(canvas.x + 10, canvas.y + 10, { button: "right" });
  await expect(page.getByRole("menuitem", { name: "新增子主题" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("menuitem", { name: "新增自由主题" })).toBeEnabled();
});
