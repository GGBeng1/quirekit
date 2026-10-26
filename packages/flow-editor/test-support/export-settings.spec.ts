import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import "./types";
/** @param page - Private workspace. @returns Completion of a colored subset and unrelated node. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
    { id: "a", shape: "note", x: -100, y: -100, width: 180, height: 100, text: "选中内容", style: { fill: "#aaccff" } },
    { id: "b", shape: "process", x: 400, y: 300, width: 180, height: 100, text: "未选内容", style: {} },
  ], edges: [] }); e.select(["a"]); e.fit(); });
}
/** @param page - Workspace. @param format - File choice. @returns Open and ready export dialog. */
async function open(page: Page, format: "png" | "svg") {
  await page.getByRole("button", { name: "图表", exact: true }).click();
  await page.getByRole("menuitem", { name: format === "png" ? "导出图片（PNG）…" : "导出矢量图（SVG）…", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "导出图片", exact: true }); await expect(dialog.getByRole("button", { name: "下载图片" })).toBeEnabled(); return dialog;
}
test("selection PNG downloads match preview dimensions and transparent or custom pixels", async ({ page }, info) => {
  await setup(page); const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  for (const solid of [false, true]) {
    const dialog = await open(page, "png"); await dialog.getByText("当前选区", { exact: true }).click();
    await dialog.getByRole("spinbutton", { name: "导出倍率", exact: true }).fill("1");
    if (solid) { await dialog.getByText("指定颜色", { exact: true }).click();
      await dialog.getByRole("button", { name: "导出背景色", exact: true }).click(); await page.getByRole("button", { name: "更多颜色", exact: true }).click();
      const hex = page.getByRole("textbox", { name: "HEX 颜色值" }); await hex.fill("#CCEEAA"); await hex.press("Tab");
      await dialog.getByRole("button", { name: "导出背景色", exact: true }).click();
    }
    await expect(dialog.getByRole("button", { name: "下载图片" })).toBeEnabled();
    const dimensions = (await dialog.getByLabel("输出尺寸").innerText()).match(/\d+/g)!.map(Number);
    await page.screenshot({ path: info.outputPath(solid ? "export-solid.png" : "export-transparent.png") });
    const download = page.waitForEvent("download"); await dialog.getByRole("button", { name: "下载图片" }).click();
    const bytes = await readFile((await (await download).path())!);
    const pixels = await page.evaluate(async data => { const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode(); const c = document.createElement("canvas"); c.width = image.width; c.height = image.height; const ctx = c.getContext("2d")!; ctx.drawImage(image, 0, 0); return { width: image.width, height: image.height, corner: [...ctx.getImageData(0, 0, 1, 1).data], center: [...ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data] }; }, bytes.toString("base64"));
    expect([pixels.width, pixels.height]).toEqual(dimensions); expect(pixels.corner).toEqual(solid ? [204, 238, 170, 255] : [0, 0, 0, 0]); expect(pixels.center[3]).toBe(255);
  }
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
});
test("SVG exports the chosen subset; cancel, mutation and readonly preserve source and release renderers", async ({ page }, info) => {
  await setup(page); await page.getByRole("button", { name: "切换只读" }).click();
  const dialog = await open(page, "svg"); await dialog.getByText("当前选区", { exact: true }).click();
  await dialog.getByText("指定颜色", { exact: true }).click(); await expect(dialog.getByRole("button", { name: "下载图片" })).toBeEnabled();
  const download = page.waitForEvent("download"); await dialog.getByRole("button", { name: "下载图片" }).click();
  const svg = await readFile((await (await download).path())!, "utf8"); expect(svg).toContain("选中内容"); expect(svg).not.toContain("未选内容"); expect(svg).toContain('data-flow-background=""'); expect(svg).not.toContain("x6-port");
  await page.getByRole("button", { name: "允许编辑" }).click(); await page.setViewportSize({ width: 620, height: 820 }); await page.getByRole("button", { name: "切换明暗主题" }).click();
  const next = await open(page, "png"); await page.screenshot({ path: info.outputPath("export-dark-narrow.png"), animations: "disabled" }); const box = (await next.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(620);
  await next.getByRole("button", { name: "取消", exact: true }).click(); await expect(page.locator(".x6-graph")).toHaveCount(1);
  await open(page, "png"); await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["a"]); e.setNodeStyle({ bold: true }); });
  await expect(page.getByRole("dialog", { name: "导出图片" })).toBeHidden(); await expect(page.locator(".x6-graph")).toHaveCount(1);
});
test("oversized PNG lowers resolution inside budget and invalid settings cannot allocate", async ({ page }) => {
  await setup(page);
  await page.evaluate(async () => { const e = window.flowFixture.editor(), source = await e.getDocument(); e.replaceDocument({ ...source, nodes: [{ ...source.nodes[0]!, width: 10000, height: 10000 }] }); e.fit(); });
  const dialog = await open(page, "png"); await expect(dialog.getByRole("status").filter({ hasText: "图片较大" })).toBeVisible();
  const result = await page.evaluate(async () => { const e = window.flowFixture.editor(), image = new Image(); image.src = await e.exportPng({ scale: 4, background: "#123456" }); await image.decode(); return { width: image.width, height: image.height }; });
  expect(result.width * result.height).toBeLessThanOrEqual(16e6); expect(result.width).toBeLessThanOrEqual(8192); expect(result.height).toBeGreaterThan(1000);
  await dialog.getByRole("spinbutton", { name: "导出倍率" }).fill(""); await expect(dialog.getByRole("button", { name: "下载图片" })).toBeDisabled();
  await dialog.getByRole("button", { name: "取消" }).click();
  expect(await page.evaluate(async () => { try { await window.flowFixture.editor().exportPng({ background: "url(evil)" }); return "unexpected"; } catch (error) { return String(error); } })).toContain("HEX");
});
