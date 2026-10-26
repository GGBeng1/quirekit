import { expect, test } from "./browser";
import { writeFile } from "node:fs/promises";
import "./types";

test("profiles SVG work in a thousand-node native input frame", async ({ page }, info) => {
  await page.addInitScript(() => { window.mindMapHarnessOnly = true; }); await page.goto("/");
  await page.evaluate(async () => {
    await window.mindMapHarness.mount(1000); const editor = window.mindMapHarness.editors[0]!;
    editor.select("n0"); await editor.execute("edit-text");
  });
  const input = page.locator('#first [contenteditable="true"]'); await expect(input).toBeFocused();
  await page.evaluate(() => {
    const counts = { reads: {} as Record<string, number>, writes: {} as Record<string, number>, identical: 0, bounds: 0, boxes: 0, boxMs: 0, styles: 0 };
    const read = Element.prototype.getAttribute, write = Element.prototype.setAttribute, box = SVGGraphicsElement.prototype.getBBox;
    const bounds = Element.prototype.getBoundingClientRect, style = window.getComputedStyle;
    // Test-only instrumentation records the browser work, then restores every
    // prototype. Production runtimes never replace global DOM operations.
    Element.prototype.getAttribute = function (name) {
      if (this instanceof SVGElement) counts.reads[name] = (counts.reads[name] ?? 0) + 1;
      return read.call(this, name);
    };
    Element.prototype.setAttribute = function (name, value) {
      if (this instanceof SVGElement) {
        counts.writes[name] = (counts.writes[name] ?? 0) + 1;
        if (read.call(this, name) === String(value)) counts.identical++;
      }
      write.call(this, name, value);
    };
    SVGGraphicsElement.prototype.getBBox = function (...args) {
      const start = performance.now(); counts.boxes++; const result = box.apply(this, args); counts.boxMs += performance.now() - start; return result;
    };
    Element.prototype.getBoundingClientRect = function () { counts.bounds++; return bounds.call(this); };
    window.getComputedStyle = function (...args) { counts.styles++; return style.apply(window, args); };
    Object.assign(window, { finishInputCost() {
      Element.prototype.getAttribute = read; Element.prototype.setAttribute = write; SVGGraphicsElement.prototype.getBBox = box;
      Element.prototype.getBoundingClientRect = bounds; window.getComputedStyle = style; return counts;
    } });
    window.mindMapHarness.trace.start();
  });
  await input.fill("一千主题原位编辑性能剖析");
  await expect.poll(() => page.evaluate(() => window.mindMapHarness.trace.read().events.filter(event => event.name === "node_tree_render_end").length)).toBe(1);
  const result = await page.evaluate(() => ({
    work: (window as unknown as { finishInputCost(): { boxes: number } }).finishInputCost(), trace: window.mindMapHarness.trace.read(),
  }));
  expect(result.trace.sourceReads).toBe(0); expect(result.trace.historyReads).toBe(0);
  await writeFile(info.outputPath("input-cost.json"), JSON.stringify(result, null, 2));
  expect(result.work.boxes).toBeLessThan(200);
});
