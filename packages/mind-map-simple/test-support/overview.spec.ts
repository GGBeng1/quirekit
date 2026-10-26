import { expect, test } from "./browser";
import type {} from "./types";

test("overview reuses one geometry index through viewport tracking with no source or layout work", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  const trace = await page.evaluate(async () => {
    const h = window.mindMapHarness; await h.mount(1000); const editor = h.editors[0]!;
    const original = editor.getOverview(); h.trace.start();
    for (let frame = 0; frame < 12; frame++) {
      editor.panTo({ x: original.bounds.x + frame * 50, y: original.bounds.y + frame * 20 });
      await new Promise(requestAnimationFrame);
      if (editor.getOverview() !== original) throw new Error("Viewport rebuilt overview");
    }
    h.trace.stop(); const work = h.trace.read(); editor.setZoom(.5);
    if (editor.getOverview() !== original) throw new Error("Zoom rebuilt overview");
    const final = editor.getState(); await editor.destroy();
    return { ...work, topics: original.topics.length, final };
  });
  expect(trace.topics).toBe(1000); expect(trace.events).toEqual([]); expect(trace.sourceReads).toBe(0); expect(trace.historyReads).toBe(0);
  expect(trace.final.scale).toBe(.5); expect(trace.final.canUndo).toBe(false);
});

test("focus and fit selection retain source and undo the fold as one operation", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness; await h.mount(100); const editor = h.editors[0]!;
    const source = await editor.getDocument(), id = source.root.children[0]!.id;
    await editor.focusBranch(id); const focused = await editor.getDocument(), geometry = editor.getOverview();
    const fitted = await editor.fitSelection(); await editor.execute("undo"); const restored = await editor.getDocument(); await editor.destroy();
    return { source, focused, restored, fitted, visible: geometry.topics.length };
  });
  expect(result.fitted).toBe(true); expect(result.visible).toBeLessThan(100); expect(result.restored).toEqual(result.source);
  expect(result.focused.root.children[0]!.children).toEqual(result.source.root.children[0]!.children);
});
