import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { WhiteboardEditor } from "@quirekit/whiteboard-excalidraw";
import { drawWhiteboard, selectWhiteboardSetting } from "./helpers";

test("language menus keep the runtime, entered text and native scene intact", async ({ page }) => {
  await page.goto("/");
  await drawWhiteboard(page, "中文内容 stays unchanged");
  const before = await page.evaluate(() => {
    const owner = window as unknown as { whiteboardDemo: WhiteboardEditor; localeRuntime?: WhiteboardEditor };
    owner.localeRuntime = owner.whiteboardDemo;
    return owner.whiteboardDemo.captureDraft();
  });
  await selectWhiteboardSetting(page, "English");
  await expect(page.getByRole("radio", { name: "Rectangle", exact: true })).toBeAttached();
  await expect(page.getByRole("button", { name: "Export editable file", exact: true })).toBeVisible();
  // The menu owns navigation focus and returns it to its trigger after selection.
  await expect(page.getByRole("button", { name: "Interface language: English", exact: true })).toBeFocused();
  expect(await page.evaluate(() => {
    const owner = window as unknown as { whiteboardDemo: WhiteboardEditor; localeRuntime: WhiteboardEditor };
    return { same: owner.whiteboardDemo === owner.localeRuntime, scene: owner.whiteboardDemo.captureDraft() };
  })).toEqual({ same: true, scene: before });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export editable file", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("灵感白板.excalidraw");
  expect(JSON.parse(await readFile((await file.path())!, "utf8")).elements).toEqual(before!.elements);
  await page.locator(".excalidraw").press("ControlOrMeta+z");
  await expect.poll(() => page.evaluate(() => (window as unknown as { whiteboardDemo: WhiteboardEditor }).whiteboardDemo.captureDraft()?.elements.length)).toBeLessThan(2);
  await page.locator(".excalidraw").press("ControlOrMeta+Shift+z");
  await expect.poll(() => page.evaluate(() => (window as unknown as { whiteboardDemo: WhiteboardEditor }).whiteboardDemo.captureDraft()?.elements
    .map(({ version, versionNonce, updated, ...element }) => element)))
    .toEqual(before!.elements.map(({ version, versionNonce, updated, ...element }) => element));
  await selectWhiteboardSetting(page, "中文");
  await expect(page.getByRole("radio", { name: "矩形", exact: true })).toBeAttached();
  await page.screenshot({ path: test.info().outputPath("locale-chinese.png") });
  await selectWhiteboardSetting(page, "English");
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Export editable file", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { whiteboardDemo: WhiteboardEditor }).whiteboardDemo?.captureDraft()?.elements.length)).toBe(2);
});

test("changing only the interface language does not dirty or back up an empty document", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("radio", { name: "矩形", exact: true })).toBeAttached();
  const language = page.getByRole("button", { name: "界面语言：中文", exact: true });
  const appearance = page.getByRole("button", { name: "外观：浅色", exact: true });
  await expect(language).toHaveText("");
  await expect(appearance).toHaveText("");
  await language.hover();
  await expect(page.getByRole("tooltip")).toHaveText("界面语言：中文");
  await language.focus();
  await language.press("ArrowDown");
  const menu = page.getByRole("menu", { name: "界面语言：中文", exact: true });
  await expect(menu.getByRole("menuitemradio", { name: "中文", exact: true })).toBeChecked();
  await page.screenshot({ path: test.info().outputPath("locale-menu-chinese.png") });
  await menu.press("End");
  await menu.press("Enter");
  await expect(page.getByRole("radio", { name: "Rectangle", exact: true })).toBeAttached();
  await expect(page.getByText("Local draft", { exact: true })).toBeVisible();
  await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Backing up local draft…", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("radio", { name: "Rectangle", exact: true })).toBeAttached();
  await expect(page.getByRole("region", { name: "Local draft recovery", exact: true })).toHaveCount(0);
});

test("recovery and validation follow English, including a narrow dark workspace", async ({ page }) => {
  await page.goto("/"); await drawWhiteboard(page, "待恢复的中文");
  await expect(page.getByText("草稿已备份到本机，尚未写回文档", { exact: true })).toBeVisible();
  await selectWhiteboardSetting(page, "English");
  page.on("dialog", dialog => dialog.accept()); await page.reload();
  const recovery = page.getByRole("region", { name: "Local draft recovery", exact: true });
  await expect(recovery).toContainText("Unsaved whiteboard draft found");
  await expect(page.locator("canvas.excalidraw__canvas.interactive")).toBeVisible();
  await selectWhiteboardSetting(page, "Dark");
  await expect(page.locator(".excalidraw")).toHaveClass(/theme--dark/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath("locale-recovery-english-dark.png") });
  const appearance = page.getByRole("button", { name: "Appearance: Dark", exact: true });
  await appearance.click();
  await expect(page.getByRole("menuitemradio", { name: "Dark", exact: true })).toBeChecked();
  await page.screenshot({ path: test.info().outputPath("appearance-menu-english-dark.png") });
  await page.getByRole("menu", { name: "Appearance: Dark", exact: true }).press("Escape");
  await expect(appearance).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const backup = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export draft", exact: true }).click();
  expect((await backup).suggestedFilename()).toBe("Recovered whiteboard draft.excalidraw");
  await page.getByRole("button", { name: "Restore draft", exact: true }).click();
  await expect(recovery).toBeHidden();
  await page.locator('input[type="file"]').first().setInputFiles({ name: "invalid.excalidraw", mimeType: "application/json", buffer: Buffer.from("{}") });
  await page.getByRole("button", { name: "Replace current board", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Unsupported Excalidraw file format.");
  await selectWhiteboardSetting(page, "中文");
  await expect(page.getByRole("alert")).toContainText("不支持的 Excalidraw 文件格式");
  expect(await page.evaluate(() => (window as unknown as { whiteboardDemo: WhiteboardEditor }).whiteboardDemo.captureDraft()?.elements.some(element => element.text === "待恢复的中文"))).toBe(true);
});
