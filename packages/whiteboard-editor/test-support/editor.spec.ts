import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { WhiteboardEditor } from "@quirekit/whiteboard-excalidraw";
import { drawWhiteboard, exportWhiteboard, selectWhiteboardSetting } from "./helpers";

/** @param elements - Exported native scene. @returns Semantically equal empty binding representations after upstream restore. */
function normalized(elements: readonly Record<string, unknown>[]) { return elements.map(element => ({ ...element, boundElements: element.boundElements ?? [] })); }

test("native source, PNG and input history survive theme, save and reload", async ({ page }) => {
  await page.goto("/"); await drawWhiteboard(page);
  const source = await exportWhiteboard(page);
  expect(source.elements).toHaveLength(2);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("quirekit-whiteboard-demo:v1")!));
  expect(saved.preview.dataUrl).toMatch(/^data:image\/png;base64,/); expect(saved.revision).toBe(1);
  await page.reload(); await expect(page.locator("canvas.excalidraw__canvas.interactive")).toBeVisible();
  expect(normalized((await exportWhiteboard(page)).elements)).toEqual(normalized(source.elements));
  await selectWhiteboardSetting(page, "深色");
  await expect(page.locator(".excalidraw")).toHaveClass(/theme--dark/);
  const colors = await page.locator(".excalidraw").evaluate(element => { const style = getComputedStyle(element); return [style.getPropertyValue("--color-primary").trim(), style.getPropertyValue("--qk-color-action-primary").trim()]; });
  expect(colors[0]).toBe(colors[1]);
  expect(normalized((await exportWhiteboard(page)).elements)).toEqual(normalized(source.elements));
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.getByRole("button", { name: "导出可编辑文件", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "适应画布", exact: true }).click();
  await page.screenshot({ path: test.info().outputPath("whiteboard-narrow.png") });
});

test("invalid import retains the drawing and reports a recoverable error", async ({ page }) => {
  await page.goto("/"); await drawWhiteboard(page);
  const before = await exportWhiteboard(page);
  const leave = page.waitForEvent("dialog");
  const reload = page.evaluate(() => location.reload()).catch(() => {});
  const warning = await leave; expect(warning.type()).toBe("beforeunload"); await warning.dismiss(); await reload;
  expect((await exportWhiteboard(page)).elements).toEqual(before.elements);
  await page.locator('input[type="file"][accept*="excalidraw"]').setInputFiles({ name: "invalid.excalidraw", mimeType: "application/json", buffer: Buffer.from('{"type":"excalidraw","version":999}') });
  await expect(page.getByText("导入文件会替换当前未保存的修改。")).toBeVisible();
  expect((await exportWhiteboard(page)).elements).toEqual(before.elements);
  await page.getByRole("button", { name: "保留当前白板", exact: true }).click();
  await expect(page.getByText("导入文件会替换当前未保存的修改。")).toBeHidden();
  await page.locator('input[type="file"][accept*="excalidraw"]').setInputFiles({ name: "invalid.excalidraw", mimeType: "application/json", buffer: Buffer.from('{"type":"excalidraw","version":999}') });
  await page.getByRole("button", { name: "替换当前白板", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("不支持");
  expect((await exportWhiteboard(page)).elements).toEqual(before.elements);
});

test("large Chinese diagrams export sharp bounded PNGs from native source", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "导出 PNG 图片", exact: true })).toBeEnabled();
  await page.evaluate(async url => {
    const { createWhiteboardDocument, editWhiteboardScene } = await import(/* @vite-ignore */ url);
    const scene = editWhiteboardScene(createWhiteboardDocument("large").scene, { nodes: Array.from({ length: 24 }, (_, i) => ({ id: `n${i}`, label: `第 ${i + 1} 步：方案审核`, x: (i % 6) * 280, y: Math.floor(i / 6) * 160, fill: i % 2 ? "#dcfce7" : "#dbeafe" })) });
    await (window as unknown as { whiteboardDemo: WhiteboardEditor }).whiteboardDemo.importScene(JSON.stringify(scene));
  }, `/@fs${fileURLToPath(new URL("../../whiteboard/src/index.ts", import.meta.url))}`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG 图片", exact: true }).click();
  const path = info.outputPath("whiteboard-chinese-large.png"); await (await download).saveAs(path);
  const bytes = await readFile(path);
  expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(2800); expect(bytes.readUInt32BE(16)).toBeLessThanOrEqual(3072);
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(900);
  expect((await exportWhiteboard(page)).elements.filter(item => item.type === "text")).toHaveLength(24);
});
