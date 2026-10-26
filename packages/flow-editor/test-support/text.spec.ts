import { expect, test, type Page } from "@playwright/test";
import type {} from "./types";

/** @param page - Isolated preview. @returns Open partial text dialog for one ordinary node. */
async function openText(page: Page) {
  await page.getByRole("button", { name: "文字样式", exact: true }).click();
  await page.getByRole("button", { name: "局部文字格式…", exact: true }).click();
  return page.getByRole("dialog", { name: "局部文字格式", exact: true });
}
test.beforeEach(async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("application")).toBeVisible();
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n1"]));
});
test("native text selection applies partial formats, links, history and pixel exports", async ({ page }, info) => {
  const original = await page.evaluate(() => window.flowFixture.editor().getDocument()), dialog = await openText(page);
  const input = dialog.getByRole("textbox", { name: "节点文字", exact: true }); await input.fill("重点 世界😀 regular");
  await input.press("ControlOrMeta+a"); await input.press("ArrowLeft"); await input.press("Shift+ArrowRight"); await input.press("Shift+ArrowRight");
  await expect.poll(() => input.evaluate(element => { const field = element as HTMLTextAreaElement; return [field.selectionStart, field.selectionEnd]; })).toEqual([0, 2]);
  await expect(dialog.getByText("选择了一段文字", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "加粗", exact: true }).click();
  await dialog.getByRole("spinbutton", { name: "字号", exact: true }).fill("24");
  await dialog.getByRole("button", { name: "应用字号", exact: true }).click();
  await dialog.getByRole("button", { name: "局部文字颜色", exact: true }).click();
  await page.getByRole("button", { name: "更多颜色", exact: true }).click();
  const hex = page.getByRole("textbox", { name: "HEX 颜色值" }); await hex.fill("#C41818"); await hex.press("Tab");
  await dialog.getByRole("button", { name: "局部文字颜色", exact: true }).click();
  await dialog.getByRole("button", { name: "应用颜色", exact: true }).click();
  await dialog.getByRole("textbox", { name: "链接地址", exact: true }).fill("https://example.com/docs");
  await dialog.getByRole("button", { name: "应用链接", exact: true }).click();
  await page.screenshot({ path: info.outputPath("flow-rich-light.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "应用文字", exact: true }).click();
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), node = source.nodes.find(n => n.id === "publish-n1")!;
  expect(node.text).toBe("重点 世界😀 regular"); expect(node.textSpans).toEqual([{ from: 0, to: 2, bold: true, fontSize: 24, color: "#C41818", link: "https://example.com/docs" }]);
  const span = page.locator('[data-cell-id="publish-n1"] tspan').filter({ hasText: "重点" }); await expect(span).toHaveAttribute("font-size", "24"); await expect(span).toHaveAttribute("fill", "#C41818");
  const output = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(); editor.execute("rotate-right"); editor.setZoom(.6);
    const snapshot = await editor.exportSvg(), png = await editor.exportPng(); const image = new Image(); image.src = png; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let red = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i]! > 130 && pixels[i + 1]! < 80 && pixels[i + 2]! < 80 && pixels[i + 3]! > 100) red++;
    return { svg: snapshot.svg, red };
  });
  expect(output.svg).toContain('href="https://example.com/docs"'); expect(output.red).toBeGreaterThan(10);
  await page.evaluate(() => { const editor = window.flowFixture.editor(); editor.execute("undo"); editor.execute("undo"); });
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toEqual(original.nodes);
  await page.evaluate(() => window.flowFixture.editor().execute("redo"));
  await page.getByRole("button", { name: "保存到本机", exact: true }).click(); await page.reload(); await expect(page.getByRole("application")).toBeVisible();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.find(n => n.id === "publish-n1")!.textSpans).toEqual(node.textSpans);
  await expect(page.locator('[data-cell-id="publish-n1"] tspan').filter({ hasText: "重点" })).toHaveAttribute("font-size", "24");
});
test("F2 maps existing formats, composition blocks commands, cancel and stale dialogs do not mutate", async ({ page }) => {
  await page.evaluate(() => window.flowFixture.editor().setTextContent("publish-n1", "Bold regular", [{ from: 0, to: 4, bold: true }]));
  await page.getByRole("application").focus(); await page.keyboard.press("F2");
  const input = page.getByRole("textbox", { name: "图形文字", exact: true }); await input.fill("Bo!ld regular");
  await input.dispatchEvent("compositionstart"); const source = await page.evaluate(async () => { try { await window.flowFixture.editor().getDocument(); return "bad"; } catch { return "blocked"; } }); expect(source).toBe("blocked");
  await input.dispatchEvent("compositionend"); await input.press("Control+Enter");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.find(n => n.id === "publish-n1")!.textSpans).toEqual([{ from: 0, to: 5, bold: true }]);
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument()), dialog = await openText(page);
  const native = dialog.getByRole("textbox", { name: "节点文字", exact: true });
  await native.dispatchEvent("compositionstart"); await native.dispatchEvent("keydown", { key: "Escape", isComposing: true });
  await expect(dialog).toBeVisible(); await expect(dialog.getByRole("button", { name: "应用文字", exact: true })).toBeDisabled(); await native.dispatchEvent("compositionend");
  await dialog.getByRole("textbox", { name: "节点文字", exact: true }).fill("cancel me"); await page.keyboard.press("Escape"); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  const next = await openText(page); await page.evaluate(() => window.flowFixture.editor().addNode("rectangle"));
  await next.getByRole("button", { name: "应用文字", exact: true }).click(); await expect(next.getByText("编辑目标已改变，请重新打开", { exact: true })).toBeVisible();
});
test("English partial formatting remains usable in a dark narrow workspace", async ({ page }, info) => {
  await page.evaluate(() => window.flowFixture.editor().setTextContent("publish-n1", "Write content", []));
  await page.getByRole("button", { name: "切换明暗主题", exact: true }).click(); await page.evaluate(() => window.flowFixture.setLocale("en")); await page.setViewportSize({ width: 740, height: 780 });
  await page.getByRole("button", { name: "Text style", exact: true }).click(); await page.getByRole("button", { name: "Partial text formatting…", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Partial text formatting", exact: true }); expect(await dialog.innerText()).not.toMatch(/\p{Script=Han}/u);
  await page.screenshot({ path: info.outputPath("flow-rich-dark-narrow.png"), animations: "disabled" });
  await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Make read only", exact: true }).click(); await expect(page.getByRole("button", { name: "Text style", exact: true })).toBeDisabled();
});
