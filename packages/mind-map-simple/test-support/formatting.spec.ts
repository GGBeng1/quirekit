import { expect, test } from "./browser";

test("formatting projects real SVG properties, retains native editing and survives every layout/undo/reopen", async ({ page }) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness, editor = h.editors[0]!;
    editor.select("n1");
    const before = h.notifications[0]!;
    await editor.format({ fontSize: 24, bold: true, color: "#123456", fill: "#fedcba", borderColor: "#654321", borderWidth: 3,
      shape: "ellipse", lineColor: "#ab1234", lineWidth: 3, linePattern: "dashed", lineStyle: "elbow" });
    const after = await editor.getDocument(), formatting = editor.getFormatting();
    const step = h.notifications[0]! - before;
    const svg = (await editor.exportSvg()).svg;
    for (const layout of ["logical-left", "logical-right", "mind-map"] as const) {
      await editor.setLayout(layout);
      if (JSON.stringify((await editor.getDocument()).root.children[0]!.style) !== JSON.stringify(after.root.children[0]!.style)) throw new Error("Lost formatting");
    }
    await editor.format(null); const cleared = editor.getFormatting();
    await editor.execute("undo"); const restored = editor.getFormatting();
    await editor.execute("edit-text");
    return { formatting, step, svg, version: after.version, cleared, restored, scale: editor.getState().scale };
  });
  expect(result.version).toBe(3); expect(result.step).toBe(1);
  expect(result.formatting).toMatchObject({ fontSize: 24, bold: true, shape: "ellipse", linePattern: "dashed" });
  expect(result.cleared).toEqual({}); expect(result.restored).toEqual(result.formatting);
  for (const value of ["#123456", "#fedcba", "#654321", "#ab1234", "24px", "6,4"]) expect(result.svg).toContain(value);
  const input = page.locator('#first [contenteditable="true"]');
  await expect(input).toBeFocused();
  expect(await input.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(24 * result.scale, 2);
  await input.fill("格式保留"); await input.press("Enter");
  const source = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(source.root.children[0]!.style).toEqual(result.formatting);
  await page.evaluate(async source => { await window.mindMapHarness.mount(1, "second", { document: source }); }, source);
  await expect(page.locator("#second .smm-node").filter({ hasText: /^格式保留$/ }).locator('path[d*="A"]').first()).toBeVisible();
});

test("multi-selection reports mixed fields without source reads and applies once; permissions are rechecked", async ({ page }) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  await page.evaluate(async () => { const e = window.mindMapHarness.editors[0]!; e.select("n1"); await e.format({ bold: true }); });
  await page.keyboard.press("ControlOrMeta+a");
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness, editor = h.editors[0]!;
    h.trace.start(); const mixed = editor.getFormatting(); const trace = h.trace.read(); h.trace.stop();
    const before = h.notifications[0]!;
    await editor.format({ bold: false }); const formatting = editor.getFormatting(), changes = h.notifications[0]! - before;
    await editor.execute("undo");
    editor.setReadOnly(true); let readonly = false; try { await editor.format({ fontSize: 32 }); } catch { readonly = true; }
    return { mixed, trace, formatting, changes, readonly, source: await editor.getDocument() };
  });
  expect(result.mixed.bold).toBeNull(); expect(result.trace.sourceReads).toBe(0); expect(result.trace.historyReads).toBe(0);
  expect(result.formatting.bold).toBe(false); expect(result.changes).toBe(1); expect(result.readonly).toBe(true);
  expect(result.source.root.children[0]!.style?.bold).toBe(true); expect(result.source.root.style).toBeUndefined();
});
