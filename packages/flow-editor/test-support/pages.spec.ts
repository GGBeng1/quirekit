import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type {} from "./types";

/** @param page - Isolated preview. @param english - Current host interface language. @returns The public page-and-print dialog. */
async function openPages(page: Page, english = false) {
  await page.getByRole("button", { name: english ? "Diagram" : "图表", exact: true }).click();
  await page.getByRole("menuitem", { name: english ? "Page setup and print…" : "页面与打印…", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: english ? "Page setup and print" : "页面与打印", exact: true });
  await expect(dialog.getByRole("img", { name: english ? "Print page preview" : "打印页面预览", exact: true })).toBeVisible(); return dialog;
}
test.beforeEach(async ({ page }) => { await page.goto("/"); await expect(page.getByRole("application")).toBeVisible(); });

test("root paper metadata shares cell history, replacement, stale guards and legacy absence", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), before = await editor.getDocument(), count = before.nodes.length;
    const settings = { paper: "A3" as const, orientation: "landscape" as const, margins: { top: 12, right: 15, bottom: 12, left: 15 }, scale: .75 };
    editor.setPage(settings, before); const configured = await editor.getDocument();
    const id = editor.addNode("rectangle"); editor.execute("undo"); const undoNode = await editor.getDocument();
    editor.execute("undo"); const undoPage = await editor.getDocument(); editor.execute("redo"); const redoPage = await editor.getDocument();
    editor.replaceDocument({ ...before, nodes: [{ ...before.nodes[0]!, text: "Replacement" }], edges: [] }); const replaced = await editor.getDocument();
    editor.execute("undo"); const undoReplacement = await editor.getDocument(); editor.execute("redo"); const redoReplacement = await editor.getDocument();
    const sameId = replaced.nodes[0]!.id;
    editor.replaceDocument({ ...replaced, nodes: [], edges: [{ id: sameId, source: { x: -10, y: 0 }, target: { x: 160, y: 0 }, vertices: [], routing: "straight", label: "Kind change", labelPosition: .5, style: {} }] });
    const kindChanged = await editor.getDocument(); editor.execute("undo"); const undoKind = await editor.getDocument();
    let stale = false; try { editor.setPage(settings, { page: settings }); } catch { stale = true; }
    editor.setReadOnly(true); let readonly = false; try { editor.setPage(settings); } catch { readonly = true; }
    return { before, count, configured, id, undoNode, undoPage, redoPage, replaced, undoReplacement, redoReplacement, kindChanged, undoKind, stale, readonly };
  });
  expect(result.configured.nodes).toHaveLength(result.count); expect(result.configured.page?.paper).toBe("A3");
  expect(result.undoNode.nodes).toEqual(result.before.nodes); expect(result.undoNode.page).toEqual(result.configured.page);
  expect(result.undoPage).toEqual(result.before); expect(result.redoPage).toEqual(result.configured);
  expect(result.replaced).not.toHaveProperty("page"); expect(result.undoReplacement).toEqual(result.configured); expect(result.redoReplacement).toEqual(result.replaced);
  expect(result.kindChanged.nodes).toHaveLength(0); expect(result.kindChanged.edges[0]!.id).toBe(result.replaced.nodes[0]!.id); expect(result.undoKind).toEqual(result.replaced);
  expect(result.stale && result.readonly).toBe(true);
  await page.evaluate(async () => { const editor = window.flowFixture.editor(); editor.setReadOnly(false); const source = await editor.getDocument(); editor.replaceDocument({ ...source, nodes: [], edges: [] }); editor.setReadOnly(true); });
  const empty = await openPages(page); await expect(empty.getByText("第 1 页，共 1 页", { exact: true })).toBeVisible();
  await expect(empty.getByRole("button", { name: "保存页面设置", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).not.toHaveProperty("page");
});

test("actual downloaded print HTML produces four physical A4 pages without viewport or source changes", async ({ page, context, browserName }, info) => {
  await page.evaluate(async () => {
    const editor = window.flowFixture.editor(), before = await editor.getDocument();
    editor.replaceDocument({ ...before, nodes: [0, 1, 2, 3].map(i => ({ id: `print-${i}`, shape: "process" as const, x: -360 + (i % 2) * 720, y: -120 + Math.floor(i / 2) * 1050, width: 180, height: 90, text: `Page ${i + 1}`, style: { fill: ["#ff3333", "#33cc55", "#3366ff", "#ffbb22"][i]!, color: "#111111" } })), edges: [] }); editor.setZoom(.3);
  });
  const original = await page.evaluate(() => window.flowFixture.editor().getDocument()), state = await page.evaluate(() => window.flowFixture.editor().getState()), dialog = await openPages(page);
  await dialog.getByText("固定比例", { exact: true }).click();
  await expect(dialog.getByText("第 1 页，共 4 页", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("flow-pages-light.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "下一页", exact: true }).click(); await expect(dialog.getByText("第 2 页，共 4 页", { exact: true })).toBeVisible();
  const downloaded = page.waitForEvent("download"); await dialog.getByRole("button", { name: "下载打印文件", exact: true }).click();
  const download = await downloaded, htmlPath = info.outputPath("flow-print.html"); await download.saveAs(htmlPath);
  const html = await readFile(htmlPath, "utf8"), output = await context.newPage(); await output.setContent(html); await output.evaluate(() => document.fonts.ready);
  await expect(output.locator(".qk-print-page")).toHaveCount(4); await expect(output.locator(".qk-print-definitions .x6-node")).toHaveCount(4);
  // Playwright's native print-to-PDF API is Chromium-only; all engines still
  // verify the real downloaded document, physical pages and source neutrality.
  if (browserName === "chromium") await output.pdf({ path: info.outputPath("flow-print.pdf"), preferCSSPageSize: true, printBackground: true });
  await output.screenshot({ path: info.outputPath("print-html-pages.png"), fullPage: true }); await output.close();
  expect(html).toContain("size:210mm 297mm"); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(original);
  const after = await page.evaluate(() => window.flowFixture.editor().getState()); expect({ x: after.x, y: after.y, scale: after.scale }).toEqual({ x: state.x, y: state.y, scale: state.scale });
  await dialog.getByRole("button", { name: "保存页面设置", exact: true }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).page?.scale).toBe(1);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click(); await page.reload(); await expect(page.getByRole("application")).toBeVisible();
  const reopened = await openPages(page); await expect(reopened.getByRole("radio", { name: "固定比例", exact: true })).toBeChecked(); await expect(reopened.getByText("第 1 页，共 4 页", { exact: true })).toBeVisible();
});

test("paper preview remains proportional, bilingual, read-only printable and bounded", async ({ page, context, browserName }, info) => {
  let dialog = await openPages(page); await dialog.getByText("A3", { exact: true }).click(); await dialog.getByText("横向", { exact: true }).click();
  const paper = await dialog.locator(".qk-flow-pages__paper").boundingBox(); expect(paper!.width / paper!.height).toBeCloseTo(420 / 297, 2);
  await dialog.getByRole("button", { name: "保存页面设置", exact: true }).click();
  await page.getByRole("button", { name: "切换明暗主题", exact: true }).click();
  await page.evaluate(() => { window.flowFixture.setLocale("en"); window.flowFixture.editor().setReadOnly(true); });
  await page.setViewportSize({ width: 390, height: 844 }); dialog = await openPages(page, true);
  await expect(dialog.getByRole("radio", { name: "Landscape", exact: true })).toBeChecked(); await expect(dialog.getByRole("button", { name: "Save page settings", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Download printable file", exact: true })).toBeEnabled();
  for (const input of await dialog.getByRole("spinbutton").all()) { const rect = await input.boundingBox(), root = await dialog.boundingBox(); expect(rect!.x).toBeGreaterThanOrEqual(root!.x); expect(rect!.x + rect!.width).toBeLessThanOrEqual(root!.x + root!.width + 1); }
  await page.screenshot({ path: info.outputPath("flow-pages-narrow.png"), animations: "disabled" });
  const downloading = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download printable file", exact: true }).click();
  const downloaded = await downloading, htmlPath = info.outputPath("flow-a3.html"); await downloaded.saveAs(htmlPath);
  const printable = await context.newPage(); await printable.setContent(await readFile(htmlPath, "utf8")); await printable.evaluate(() => document.fonts.ready);
  await expect(printable.locator(".qk-print-page")).toHaveCount(1);
  if (browserName === "chromium") await printable.pdf({ path: info.outputPath("flow-a3-landscape.pdf"), preferCSSPageSize: true, printBackground: true });
  await printable.close();
  await dialog.getByRole("contentinfo").getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(async () => { const editor = window.flowFixture.editor(); editor.setReadOnly(false); const source = await editor.getDocument(); editor.replaceDocument({ ...source, nodes: source.nodes.map((node, i) => ({ ...node, x: i * 100000 })), edges: [] }); });
  dialog = await openPages(page, true); await dialog.getByText("Fixed scale", { exact: true }).click();
  await expect(dialog.getByText("More than 100 pages. Reduce the scale or fit on one page.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Print / Save PDF", exact: true })).toBeDisabled();
});

test("explicit native print prepares one sandboxed frame and closing cancels delayed printing", async ({ page, browserName }) => {
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument()), dialog = await openPages(page);
  await page.clock.install();
  await page.evaluate(() => {
    const control = { hold: false, calls: 0, release: undefined as (() => void) | undefined };
    (window as unknown as { printProbe: typeof control }).printProbe = control;
    document.addEventListener("load", event => {
      const node = event.target;
      if (!(node instanceof HTMLIFrameElement) || !node.hasAttribute("sandbox")) return;
      const source = node.contentDocument!, view = node.contentWindow!;
      if (!source.querySelector(".qk-print-page")) return;
      // Capture runs before the production frame's load listener, so the font
      // gate is installed before its asynchronous preparation reads fonts.ready.
      document.body.dataset.flowPrintSandbox = node.getAttribute("sandbox")!;
      document.body.dataset.flowPrintPages = String(source.querySelectorAll(".qk-print-page").length);
      view.print = () => { control.calls++; document.body.dataset.flowPrintCalls = String(control.calls); view.dispatchEvent(new (view as Window & typeof globalThis).Event("afterprint")); };
      if (control.hold) Object.defineProperty(source, "fonts", { value: { ready: new Promise<void>(resolve => { control.release = resolve; document.body.dataset.flowPrintWaiting = "yes"; }) } });
    }, true);
  });
  await dialog.getByRole("button", { name: "打印 / 保存 PDF", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-flow-print-calls", "1");
  await expect(page.locator("body")).toHaveAttribute("data-flow-print-pages", "1");
  await expect(page.locator("body")).toHaveAttribute("data-flow-print-sandbox", "allow-same-origin allow-modals");
  if (browserName === "webkit") {
    // WebKit blocks parent listeners in script-disabled child frames. Exercise
    // the existing parent's watchdog without weakening the product sandbox.
    await expect(page.locator('iframe[sandbox]')).toHaveCount(1); await page.clock.fastForward(60_000);
  }
  await expect(page.locator('iframe[sandbox]')).toHaveCount(0);
  await page.evaluate(() => { (window as unknown as { printProbe: { hold: boolean } }).printProbe.hold = true; });
  await dialog.getByRole("button", { name: "打印 / 保存 PDF", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-flow-print-waiting", "yes");
  await expect(page.locator("body")).toHaveAttribute("data-flow-print-calls", "1");
  await dialog.getByRole("contentinfo").getByRole("button", { name: "关闭", exact: true }).click();
  await page.evaluate(async () => { (window as unknown as { printProbe: { release: () => void } }).printProbe.release(); await Promise.resolve(); });
  await expect(page.locator('iframe[sandbox]')).toHaveCount(0); await expect(page.locator("body")).toHaveAttribute("data-flow-print-calls", "1");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.evaluate(() => { delete document.body.dataset.flowPrintWaiting; });
  const next = await openPages(page); await next.getByRole("button", { name: "打印 / 保存 PDF", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-flow-print-waiting", "yes");
  await page.evaluate(() => { window.flowFixture.editor().addNode("rectangle"); (window as unknown as { printProbe: { release: () => void } }).printProbe.release(); });
  await expect(page.locator('iframe[sandbox]')).toHaveCount(0); await expect(page.locator("body")).toHaveAttribute("data-flow-print-calls", "1");
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toHaveLength(before.nodes.length + 1);
});

test("opening page settings commits pending native caption input and remains a separate undo step", async ({ page }) => {
  await page.evaluate(() => window.flowFixture.editor().select(["publish-n1"]));
  await page.getByRole("application").press("F2"); const input = page.getByRole("textbox", { name: "图形文字", exact: true });
  await input.fill("Pending print caption"); const dialog = await openPages(page);
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[1]!.text).toBe("Pending print caption");
  await dialog.getByText("A3", { exact: true }).click(); await dialog.getByRole("button", { name: "保存页面设置", exact: true }).click();
  await page.evaluate(() => window.flowFixture.editor().execute("undo"));
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()); expect(source).not.toHaveProperty("page"); expect(source.nodes[1]!.text).toBe("Pending print caption");
});
