import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

test("partial italic and combined decorations preserve native selection, one-step history, SVG, PNG and PDF", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("application")).toBeVisible();
  await page.evaluate(() => { const editor = window.flowFixture.editor(); editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [{ id: "style-text", shape: "rectangle", x: -40, y: -20, width: 440, height: 120, text: "中文 Flow styles", style: { fontSize: 28, fill: "#ffffff", stroke: "#6688aa" } }], edges: [] }); editor.select(["style-text"]); });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  await page.getByRole("button", { name: "文字样式", exact: true }).click(); await page.getByRole("button", { name: "局部文字格式…", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "局部文字格式", exact: true }), input = dialog.getByRole("textbox", { name: "节点文字", exact: true });
  await input.focus(); await input.press("ControlOrMeta+a"); await input.press("ArrowLeft");
  for (let i = 0; i < 7; i++) await input.press("Shift+ArrowRight");
  await expect.poll(() => input.evaluate(element => { const field = element as HTMLTextAreaElement; return [field.selectionStart, field.selectionEnd]; })).toEqual([0, 7]);
  for (const name of ["斜体", "下划线", "删除线"]) { await dialog.getByRole("button", { name, exact: true }).click(); await expect(dialog.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true"); }
  await dialog.getByRole("button", { name: "应用文字", exact: true }).click();
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(source.nodes[0]!.textSpans).toEqual([{ from: 0, to: 7, italic: true, underline: true, strike: true }]);
  const span = page.locator('[data-cell-id="style-text"] tspan').filter({ hasText: "中文 Flow" }); await expect(span).toHaveAttribute("font-style", "italic"); await expect(span).toHaveAttribute("text-decoration", "underline line-through");
  await page.screenshot({ path: info.outputPath("styles-canvas.png"), animations: "disabled" });
  const snapshot = await page.evaluate(() => window.flowFixture.editor().exportSvg()); await writeFile(info.outputPath("styles.svg"), snapshot.svg);
  const png = await page.evaluate(() => window.flowFixture.editor().exportPng()); await writeFile(info.outputPath("styles.png"), Buffer.from(png.split(",")[1]!, "base64"));
  await page.getByRole("button", { name: "图表", exact: true }).click(); await page.getByRole("menuitem", { name: "页面与打印…", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "页面与打印", exact: true }); await expect(dialog.getByRole("button", { name: "下载 PDF", exact: true })).toBeEnabled();
  const downloading = page.waitForEvent("download"); await dialog.getByRole("button", { name: "下载 PDF", exact: true }).click(); await (await downloading).saveAs(info.outputPath("styles.pdf"));
  await dialog.getByRole("contentinfo").getByRole("button", { name: "关闭", exact: true }).click(); await page.evaluate(() => window.flowFixture.editor().execute("undo"));
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before); await page.evaluate(() => window.flowFixture.editor().execute("redo"));
  await page.getByRole("button", { name: "文字样式", exact: true }).click(); await page.getByRole("button", { name: "局部文字格式…", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "局部文字格式", exact: true }); input = dialog.getByRole("textbox", { name: "节点文字", exact: true });
  await input.focus(); await input.press("ControlOrMeta+a"); await dialog.getByRole("button", { name: "清除局部格式", exact: true }).click(); await dialog.getByRole("button", { name: "应用文字", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]).not.toHaveProperty("textSpans");
  await page.evaluate(() => window.flowFixture.editor().execute("undo")); await page.getByRole("button", { name: "保存到本机", exact: true }).click(); await page.reload(); await expect(page.getByRole("application")).toBeVisible();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.textSpans).toEqual(source.nodes[0]!.textSpans);
});
