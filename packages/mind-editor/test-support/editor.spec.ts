import { toggleMindPreviewTheme } from "./preferences/testing";
import { expect, test } from "@playwright/test";

test("shared toolbar edits, undoes and saves canonical source for reopening", async ({ page }) => {
  const failures: string[] = []; page.on("pageerror", error => failures.push(error.message));
  await page.goto("/");
  const nodes = page.locator(".qk-mind-editor__surface .smm-node");
  await expect(nodes).toHaveCount(14);
  await expect(page).toHaveTitle("Quire Mind");
  await expect(page.getByRole("heading", { name: "Quire Mind", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "新增子主题", exact: true }).click();
  await expect(nodes).toHaveCount(15);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(nodes).toHaveCount(14);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(nodes).toHaveCount(15);
  await nodes.filter({ hasText: "确定三个优先目标" }).dblclick();
  const input = page.locator('[contenteditable="true"]');
  await input.fill("完成本周三个目标");
  await input.press("Enter");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByRole("button", { name: "已保存到本机", exact: true })).toBeVisible();
  await page.reload();
  await expect(nodes).toHaveCount(15);
  await expect(nodes.filter({ hasText: "完成本周三个目标" })).toBeVisible();
  expect(failures).toEqual([]);
});

test("viewport resizes, pans gently, zooms and returns to content without host scroll", async ({ page }, info) => {
  await page.goto("/");
  const surface = page.locator("[data-quirekit-mind-map]");
  const root = page.locator(".smm-node").filter({ hasText: /^时间管理$/ });
  await expect(root).toBeVisible();
  const before = (await root.boundingBox())!;
  await surface.hover(); await page.mouse.wheel(0, 20);
  await expect.poll(async () => (await root.boundingBox())!.y).not.toBe(before.y);
  expect(Math.abs((await root.boundingBox())!.y - before.y)).toBeLessThanOrEqual(12);
  await expect(page.getByRole("status")).toHaveText("就绪");
  const area = (await surface.boundingBox())!;
  const start = (await root.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  // The first drag removes the selection outline; measure the actual text geometry.
  const rootText = root.locator("text").first();
  const dragStart = (await rootText.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2 + 120, start.y + start.height / 2 + 50, { steps: 6 });
  await page.mouse.up();
  expect((await rootText.boundingBox())!.x - dragStart.x).toBeCloseTo(120, 0);
  await page.getByRole("button", { name: "画布居中", exact: true }).click();
  await page.getByRole("button", { name: "放大", exact: true }).click();
  expect((await root.boundingBox())!.width).toBeGreaterThan(before.width);
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.setViewportSize({ width: 740, height: 600 });
  await expect.poll(() => surface.evaluate(element => Math.abs(element.clientWidth - element.querySelector("svg")!.getBoundingClientRect().width))).toBeLessThan(1);
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(740);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const canvas = (await surface.boundingBox())!;
  const fitted = (await root.boundingBox())!;
  expect(fitted.x).toBeGreaterThan(canvas.x);
  expect(fitted.x + fitted.width).toBeLessThan(canvas.x + canvas.width);
  const fitButton = (await page.getByRole("button", { name: "适应画布", exact: true }).boundingBox())!;
  expect(fitButton.x + fitButton.width).toBeLessThanOrEqual(740);
  await page.screenshot({ path: info.outputPath("narrow.png") });
});

test("native text stays single and toolbar is unavailable during IME composition", async ({ page }, info) => {
  await page.goto("/");
  await page.locator(".smm-node").filter({ hasText: /^时间管理$/ }).dblclick();
  const input = page.locator('[contenteditable="true"]');
  await expect(input).toHaveCSS("box-shadow", "none");
  await expect(input).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await input.dispatchEvent("compositionstart", { data: "" });
  await input.evaluate(element => {
    element.textContent = "中文计划";
    element.dispatchEvent(new CompositionEvent("compositionupdate", { data: "中文计划", bubbles: true }));
    element.dispatchEvent(new InputEvent("input", { data: "中文计划", inputType: "insertCompositionText", isComposing: true, bubbles: true }));
  });
  // Observe the live projection during composition, including the delayed layout.
  await expect.poll(() => page.locator(".smm-node").allTextContents()).toContain("中文计划");
  // Synthetic composition does not activate the OS IME. Dispatch its confirmation
  // key without Chromium's ordinary Enter default, which would insert a newline.
  await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", keyCode: 229, isComposing: true });
  await expect(input).toBeVisible();
  await expect(page.getByRole("button", { name: "新增子主题", exact: true })).toBeDisabled();
  await expect(input).toHaveText("中文计划");
  await page.screenshot({ path: info.outputPath("inline-ime.png") });
  await input.evaluate(element => element.dispatchEvent(new CompositionEvent("compositionend", { data: "中文计划", bubbles: true })));
  await expect(page.getByRole("status")).not.toHaveText("正在输入…");
  await input.press("Enter");
  await expect(page.locator(".smm-node").filter({ hasText: /^中文计划$/ })).toHaveCount(1);
  await expect(page.locator(".qk-mind-editor__document-title")).toHaveText("中文计划");
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator(".smm-node").filter({ hasText: /^时间管理$/ })).toHaveCount(1);
  await expect(page.locator(".qk-mind-editor__document-title")).toHaveText("时间管理");
  await expect(page.getByRole("button", { name: "外观" }).locator("svg")).toBeVisible();
});

test("uses theme blue and exports source and SVG across light/dark themes", async ({ page }, info) => {
  const failures: string[] = []; page.on("pageerror", error => failures.push(error.message));
  await page.goto("/");
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await expect(page.getByRole("status")).toHaveText("就绪");
  await page.screenshot({ path: info.outputPath("light.png") });
  await toggleMindPreviewTheme(page);
  await expect.poll(() => page.locator(".qk-mind-editor").evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgb(255, 255, 255)");
  await expect(page.locator(".smm-node")).toHaveCount(14);
  await page.screenshot({ path: info.outputPath("dark.png") });
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "脑图文件（JSON）" }).click();
  const sourceDownload = await download;
  expect(sourceDownload.suggestedFilename()).toBe("时间管理.json");
  const sourcePath = await sourceDownload.path();
  const { readFile } = await import("node:fs/promises");
  const source = JSON.parse(await readFile(sourcePath!, "utf8"));
  expect(source.root.text).toBe("时间管理");
  expect(source.version).toBe(1);
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const svgDownload = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "矢量图（SVG）" }).click();
  const svgPath = await (await svgDownload).path();
  expect(await readFile(svgPath!, "utf8")).toContain("时间管理");
  expect(failures).toEqual([]);
});
