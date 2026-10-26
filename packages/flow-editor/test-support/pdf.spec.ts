import { expect, test, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { flowchartSvgImage } from "@quirekit/flowchart";
import type {} from "./types";

/** @param page - Isolated preview. @param english - Interface language. @returns Ready page/PDF dialog. */
async function pages(page: Page, english = false) {
  await page.getByRole("button", { name: english ? "Diagram" : "图表", exact: true }).click();
  await page.getByRole("menuitem", { name: english ? "Page setup and print…" : "页面与打印…", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: english ? "Page setup and print" : "页面与打印", exact: true });
  await expect(dialog.getByRole("button", { name: english ? "Download PDF" : "下载 PDF", exact: true })).toBeEnabled(); return dialog;
}
test.beforeEach(async ({ page }) => { await page.goto("/"); await expect(page.getByRole("application")).toBeVisible(); });
test("direct A3 PDF preserves Chinese, rich captions, links, sketch paths and vector/PNG resources", async ({ page }, info) => {
  const icon = flowchartSvgImage('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 4L22 4L22 20L2 20Z" stroke="#4466aa" fill="#bbddff"/><path d="M8 4V20M16 4V20" stroke="#4466aa"/></svg>', "矢量图标");
  await page.evaluate(async image => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument();
    const png = document.createElement("canvas"); png.width = 80; png.height = 40; const ctx = png.getContext("2d")!; ctx.fillStyle = "#ff5533"; ctx.fillRect(0, 0, 80, 40);
    editor.replaceDocument({ ...source, nodes: [
      { id: "pdf-text", shape: "process", x: -160, y: -80, width: 340, height: 120, text: "中文流程 Vector", style: { fill: "#eff6ff", stroke: "#4466aa", drawing: "sketch" }, textSpans: [{ from: 0, to: 4, bold: true, color: "#aa3366", fontSize: 24, link: "https://example.com/flow" }] },
      { id: "pdf-svg", shape: "image", x: 280, y: -80, width: 120, height: 120, text: "", style: {}, image },
      { id: "pdf-png", shape: "image", x: 280, y: 100, width: 120, height: 60, text: "", style: {}, image: { dataUrl: png.toDataURL(), width: 80, height: 40, alt: "PNG image" } },
    ], edges: [{ id: "pdf-edge", source: { node: "pdf-text", port: "right" }, target: { node: "pdf-svg", port: "left" }, routing: "orthogonal", connector: "rounded", vertices: [], label: "连接", labelPosition: .5, style: { sourceArrow: "open", targetArrow: "block" } }] });
  }, icon);
  const frame = (await page.locator('[data-cell-id="pdf-text"] path').first().boundingBox())!, caption = (await page.locator('[data-cell-id="pdf-text"] tspan').filter({ hasText: "中文流程" }).boundingBox())!;
  expect(caption.x).toBeGreaterThan(frame.x); expect(caption.x + caption.width).toBeLessThan(frame.x + frame.width);
  expect(caption.y).toBeGreaterThan(frame.y); expect(caption.y + caption.height).toBeLessThan(frame.y + frame.height);
  await writeFile(info.outputPath("source.svg"), (await page.evaluate(() => window.flowFixture.editor().exportSvg())).svg);
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument()), dialog = await pages(page);
  await dialog.getByText("A3", { exact: true }).click(); await dialog.getByText("横向", { exact: true }).click();
  const waiting = page.waitForEvent("download"); await dialog.getByRole("button", { name: "下载 PDF", exact: true }).click();
  const download = await waiting, target = info.outputPath("vector-a3.pdf"); await download.saveAs(target);
  expect(download.suggestedFilename()).toBe("流程图.pdf"); expect((await readFile(target)).subarray(0, 4).toString()).toBe("%PDF");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await expect(dialog.getByRole("button", { name: "下载 PDF", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => [...document.fonts].filter(font => font.family.startsWith("qk-pdf-")).length)).toBe(0);
});
test("direct fixed-scale PDF covers four negative-coordinate A4 sheets, and empty read-only English output works", async ({ page }, info) => {
  await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), source = await editor.getDocument();
    editor.replaceDocument({ ...source, nodes: [0, 1, 2, 3].map(i => ({ id: `sheet-${i}`, shape: "process" as const, x: -360 + i % 2 * 720, y: -120 + Math.floor(i / 2) * 1050, width: 180, height: 90, text: `第 ${i + 1} 页`, style: { fill: ["#ffcccc", "#ccffdd", "#ccddff", "#ffeecc"][i]! } })), edges: [] });
  });
  let dialog = await pages(page); await dialog.getByText("固定比例", { exact: true }).click(); await expect(dialog.getByText("第 1 页，共 4 页", { exact: true })).toBeVisible();
  let waiting = page.waitForEvent("download"); await dialog.getByRole("button", { name: "下载 PDF", exact: true }).click(); await (await waiting).saveAs(info.outputPath("vector-four-a4.pdf"));
  await dialog.getByRole("contentinfo").getByRole("button", { name: "关闭", exact: true }).click();
  await page.evaluate(async () => { const editor = window.flowFixture.editor(), source = await editor.getDocument(); editor.replaceDocument({ ...source, nodes: [], edges: [] }); editor.setReadOnly(true); window.flowFixture.setLocale("en"); });
  await page.setViewportSize({ width: 390, height: 844 }); dialog = await pages(page, true);
  await expect(dialog.getByRole("button", { name: "Save page settings", exact: true })).toBeDisabled();
  waiting = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download PDF", exact: true }).click(); const empty = await waiting;
  expect(empty.suggestedFilename()).toBe("Flowchart.pdf"); await empty.saveAs(info.outputPath("vector-empty.pdf")); await page.screenshot({ path: info.outputPath("pdf-narrow.png"), animations: "disabled" });
});
test("closing or source changes during font loading revoke the request and prevent late downloads", async ({ page }) => {
  let arrived = 0, release: (() => void) | undefined; const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/NotoSansHans-Regular.otf", async route => { arrived++; await delayed; await route.continue().catch(() => {}); });
  const downloads: string[] = []; page.on("download", download => downloads.push(download.suggestedFilename()));
  let dialog = await pages(page); await dialog.getByRole("button", { name: "下载 PDF", exact: true }).click(); await expect.poll(() => arrived).toBe(1);
  await dialog.getByRole("contentinfo").getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "页面与打印", exact: true })).toHaveCount(0); release!();
  await page.unroute("**/NotoSansHans-Regular.otf");
  let releaseSecond: (() => void) | undefined; const second = new Promise<void>(resolve => { releaseSecond = resolve; });
  await page.route("**/NotoSansHans-Regular.otf", async route => { arrived++; await second; await route.continue().catch(() => {}); });
  dialog = await pages(page); await dialog.getByRole("button", { name: "下载 PDF", exact: true }).click(); await expect.poll(() => arrived).toBe(2);
  await page.evaluate(() => window.flowFixture.editor().addNode("rectangle")); releaseSecond!(); await page.unroute("**/NotoSansHans-Regular.otf");
  await expect(dialog).toHaveCount(0); await expect(page.getByRole("application")).toBeVisible(); expect(downloads).toEqual([]);
});
