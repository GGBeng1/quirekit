import { expect, test } from "@playwright/test";
import { drawWhiteboard, exportWhiteboard, selectWhiteboardSetting } from "./helpers";
import { fileURLToPath } from "node:url";

test("passive checkpoints preserve active Chinese input and recover after reload", async ({ page }) => {
  await page.goto("/"); await drawWhiteboard(page, "仍在输入的中文草稿");
  const input = page.locator("textarea.excalidraw-wysiwyg");
  await expect(input).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "草稿已备份到本机" })).toBeVisible();
  await expect(input).toBeFocused(); await expect(input).toHaveValue("仍在输入的中文草稿");
  // Reload accepts the native guard, but never presses Save or ends text input.
  page.once("dialog", dialog => dialog.accept()); await page.reload();
  const recovery = page.getByRole("region", { name: "本机草稿恢复" });
  await expect(recovery).toBeVisible();
  await expect(page.getByRole("button", { name: "保存到本机", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("quirekit-whiteboard-demo:v1"))).toBeNull();
  await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
  await expect(recovery).toBeHidden();
  expect((await exportWhiteboard(page)).elements.some(element => element.text === "仍在输入的中文草稿")).toBe(true);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload(); await expect(page.locator("canvas.excalidraw__canvas.interactive")).toBeVisible();
  await expect(recovery).toBeHidden();
  expect((await exportWhiteboard(page)).elements.some(element => element.text === "仍在输入的中文草稿")).toBe(true);
});

test("closing a page preserves a checkpoint; explicit discard removes it in dark narrow UI", async ({ page, context }, info) => {
  await page.goto("/"); await drawWhiteboard(page, "关闭后找回");
  await expect(page.getByRole("status").filter({ hasText: "草稿已备份到本机" })).toBeVisible();
  await page.close();
  const reopened = await context.newPage(); await reopened.goto("/");
  await expect(reopened.getByRole("region", { name: "本机草稿恢复" })).toBeVisible();
  // The recovery record arrives before the lazy drawing runtime takes initial focus.
  await expect(reopened.locator("canvas.excalidraw__canvas.interactive")).toBeVisible();
  await selectWhiteboardSetting(reopened, "深色");
  await reopened.setViewportSize({ width: 390, height: 844 });
  expect(await reopened.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(reopened.getByRole("button", { name: "恢复草稿", exact: true })).toBeVisible();
  await reopened.screenshot({ path: info.outputPath("recovery-dark-narrow.png") });
  await reopened.getByRole("button", { name: "丢弃草稿", exact: true }).click();
  await expect(reopened.getByRole("region", { name: "本机草稿恢复" })).toBeHidden();
  await reopened.reload(); await expect(reopened.locator("canvas.excalidraw__canvas.interactive")).toBeVisible();
  await expect(reopened.getByRole("region", { name: "本机草稿恢复" })).toBeHidden();
  expect((await exportWhiteboard(reopened)).elements).toEqual([]);
});

test("a newer canonical board offers stale source export without allowing overwrite", async ({ page }) => {
  await page.goto("/"); await drawWhiteboard(page, "旧版本草稿");
  await expect(page.getByRole("status").filter({ hasText: "草稿已备份到本机" })).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem("quirekit-whiteboard-demo:v1", JSON.stringify({ type: "quirekit-whiteboard", version: 1, id: "standalone-whiteboard", revision: 3, title: "另一个版本",
      scene: { type: "excalidraw", version: 2, source: "quirekit", elements: [], appState: {}, files: {} }, preview: null }));
  });
  page.once("dialog", dialog => dialog.accept()); await page.reload();
  await expect(page.getByText("正文已变化，已保留旧草稿", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "恢复草稿", exact: true })).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出草稿", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("白板恢复草稿.excalidraw");
  await page.getByRole("button", { name: "丢弃草稿", exact: true }).click();
  expect((await exportWhiteboard(page)).elements).toEqual([]);
});

test("browser storage arbitrates simultaneous writes and preserves a newer token on stale delete", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async url => {
    const { createWhiteboardDraftStore } = await import(/* @vite-ignore */ url);
    const a = createWhiteboardDraftStore(indexedDB), b = createWhiteboardDraftStore(indexedDB);
    const base = { version: 1, updatedAt: 1, base: "a".repeat(64), scene: { type: "excalidraw", version: 2, source: "quirekit", elements: [], appState: {}, files: {} } };
    const wins = await Promise.all([a.save("race", null, { ...base, token: "a" }), b.save("race", null, { ...base, token: "b" })]);
    const first = await a.load("race");
    await b.save("race", first.token, { ...base, token: "newer" });
    const removed = await a.remove("race", first.token), latest = await b.load("race");
    return { wins, removed, token: latest.token };
  }, `/@fs${fileURLToPath(new URL("../src/draft/browser.ts", import.meta.url))}`);
  expect(result.wins.filter(Boolean)).toHaveLength(1); expect(result.removed).toBe(false); expect(result.token).toBe("newer");
});
