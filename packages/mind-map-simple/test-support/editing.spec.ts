import { expect, test } from "./browser";
import type {} from "./types";

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
});

test("Chinese text, literal markup, structure, history and SVG round-trip", async ({ page }, info) => {
  const failures: string[] = []; page.on("pageerror", error => failures.push(error.message));
  await page.evaluate(() => window.mindMapHarness.mount());
  await page.locator("#first .smm-node").filter({ hasText: "时间管理" }).dblclick();
  const editor = page.locator('#first [contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.fill("中文输入测试😀");
  // Exercise the surface's actual multiline input gesture, not synthetic paragraph HTML.
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.insertText("<img src=x onerror=alert(1)>");
  // Reading must commit an active overlay without requiring a prior Enter key.
  const edited = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(edited.root.text).toBe("中文输入测试😀\n<img src=x onerror=alert(1)>");
  await expect(page.locator("#first img")).toHaveCount(0);
  await page.evaluate(async () => {
    const editor = window.mindMapHarness.editors[0]!;
    editor.select("n0"); await editor.execute("add-child");
  });
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).root.children.length)).toBe(5);
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("undo"));
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).root.children.length)).toBe(4);
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("redo"));
  const snapshot = await page.evaluate(() => window.mindMapHarness.editors[0]!.exportSvg());
  expect(snapshot.svg).toContain("中文输入测试");
  expect(snapshot.width).toBeGreaterThan(100); expect(snapshot.height).toBeGreaterThan(100);
  expect(await page.evaluate(async (svg) => {
    const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode(); return image.naturalWidth > 0;
  }, snapshot.svg)).toBe(true);
  const final = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  await page.evaluate(async (document) => {
    await window.mindMapHarness.editors[0]!.destroy();
    await window.mindMapHarness.mount(21, "first", { document });
  }, final);
  expect(await page.evaluate(() => window.mindMapHarness.editors[1]!.getDocument())).toEqual(final);
  await page.locator("#first").screenshot({ path: info.outputPath("mind-map.png") });
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});

test("focus and composition isolate two maps from each other and outer input", async ({ page }) => {
  await page.evaluate(async () => {
    await window.mindMapHarness.mount(); await window.mindMapHarness.mount(5, "second");
    window.mindMapHarness.editors[0]!.select("n0");
  });
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).root.children.length)).toBe(5);
  await page.locator("#outside").fill("外部编辑"); await page.keyboard.press("Enter");
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[1]!.getDocument()).root.children.length)).toBe(4);
  await page.evaluate(() => window.mindMapHarness.editors[1]!.select("n0"));
  await page.locator("#second [data-quirekit-mind-map]").dispatchEvent("compositionstart");
  await page.locator("#second [data-quirekit-mind-map]").evaluate(element => {
    element.dispatchEvent(new CompositionEvent("compositionupdate", { data: "中", bubbles: true }));
  });
  await page.keyboard.press("Enter");
  expect(await page.evaluate(async () => {
    try { await window.mindMapHarness.editors[1]!.getDocument(); return false; } catch { return true; }
  })).toBe(true);
  await page.locator("#second [data-quirekit-mind-map]").dispatchEvent("compositionend");
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[1]!.getDocument()).root.children.length)).toBe(4);
  const notifications = await page.evaluate(() => [...window.mindMapHarness.notifications]);
  await page.evaluate(() => { window.mindMapHarness.editors[0]!.select("n1"); window.mindMapHarness.editors[0]!.select("n2"); });
  expect(await page.evaluate(() => window.mindMapHarness.notifications)).toEqual(notifications);
});

test("collapsed descendants survive and readonly commands cannot edit", async ({ page }) => {
  await page.evaluate(async () => {
    await window.mindMapHarness.mount();
    const editor = window.mindMapHarness.editors[0]!; editor.select("n1"); await editor.execute("toggle-collapse");
  });
  const source = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(source.root.children[0]?.collapsed).toBe(true);
  expect(source.root.children[0]?.children).toHaveLength(4);
  await page.evaluate(document => window.mindMapHarness.mount(21, "second", { readOnly: true, document }), source);
  expect(await page.evaluate(async () => {
    const editor = window.mindMapHarness.editors[1]!; editor.select("n0");
    try { await editor.execute("add-child"); return false; } catch { return true; }
  })).toBe(true);
  expect(await page.evaluate(() => window.mindMapHarness.editors[1]!.getDocument())).toEqual(source);
});
