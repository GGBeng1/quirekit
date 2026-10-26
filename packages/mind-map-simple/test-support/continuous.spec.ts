import { expect, test } from "./browser";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

const cycles = Number(process.env.QUIRE_MIND_SOAK_CYCLES ?? "30");
if (!Number.isInteger(cycles) || cycles < 30 || cycles > 10000) throw new Error("QUIRE_MIND_SOAK_CYCLES must be an integer from 30 to 10000");

test(`${cycles} edit/history/selection/pan cycles retain one owner and reopen the exact source`, async ({ page }, info) => {
  test.setTimeout(Math.max(180000, cycles * 1500));
  const started = performance.now();
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => { await window.mindMapHarness.mount(); window.mindMapHarness.editors[0]!.setZoom(.6); });
  const samples = [];
  for (let cycle = 1; cycle <= cycles; cycle++) {
    const previous = await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument());
    await page.evaluate(async () => {
      const e = window.mindMapHarness.editors.at(-1)!; e.select("n0"); await e.execute("edit-text");
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); window.mindMapHarness.trace.start();
    });
    const input = page.locator('#first [contenteditable="true"]');
    await input.fill(`连续创作第 ${cycle} 次`);
    await expect.poll(() => page.evaluate(() => window.mindMapHarness.trace.read().events.filter(e => e.name === "node_tree_render_end").length)).toBe(1);
    const trace = await page.evaluate(() => { window.mindMapHarness.trace.stop(); return window.mindMapHarness.trace.read(); });
    expect(trace.sourceReads).toBe(0); expect(trace.historyReads).toBe(0);
    await input.press("Enter"); await expect(input).toBeHidden();
    const edited = await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument());
    expect(edited.root.text).toBe(`连续创作第 ${cycle} 次`);
    await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.execute("undo"));
    expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument())).toEqual(previous);
    await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.execute("redo"));
    expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument())).toEqual(edited);

    // Structural changes have their own history step, while transient selection
    // and root panning consume client coordinates without changing world data.
    await page.evaluate(async () => { const e = window.mindMapHarness.editors.at(-1)!; e.select("n0"); await e.execute("add-child"); });
    await expect(page.locator("#first .smm-node")).toHaveCount(22);
    await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.execute("undo"));
    expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument())).toEqual(edited);
    await page.evaluate(async () => { const e = window.mindMapHarness.editors.at(-1)!; e.select("n1"); await e.execute("remove"); });
    await expect(page.locator("#first .smm-node")).toHaveCount(16);
    await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.execute("undo"));
    expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument())).toEqual(edited);
    const area = (await page.locator("#first").boundingBox())!;
    await page.mouse.click(area.x + 8, area.y + 8);
    expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getState().selectedCount)).toBe(0);
    await page.locator("#first .smm-node").filter({ hasText: /^主题 2 · 本周计划$/ }).click();
    expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getState().selectedId)).toBe("n2");
    if (cycle % 5 === 0) {
      await page.evaluate(() => { const e = window.mindMapHarness.editors.at(-1)!; e.select("n0"); window.mindMapHarness.trace.start(); });
      const root = (await page.locator("#first .smm-node").filter({ hasText: /^连续创作第/ }).boundingBox())!;
      const start = { x: root.x + root.width / 2, y: root.y + root.height / 2 };
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      await page.mouse.move(start.x + 12, start.y + 5, { steps: 5 }); await page.mouse.up();
      const pan = await page.evaluate(() => { window.mindMapHarness.trace.stop(); return window.mindMapHarness.trace.read(); });
      expect(pan.events).toEqual([]); expect(pan.sourceReads).toBe(0); expect(pan.historyReads).toBe(0);
      expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument())).toEqual(edited);
    }
    if (cycle % 10 === 0) {
      await page.evaluate(async () => {
        const h = window.mindMapHarness, e = h.editors.at(-1)!, document = await e.getDocument();
        await e.destroy(); await h.mount(21, "first", { document }); h.editors.at(-1)!.setZoom(.6);
      });
      expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument())).toEqual(edited);
      await expect(page.locator("[data-quirekit-mind-map]")).toHaveCount(1);
    }
    await expect(page.locator("[data-mind-gesture]")).toHaveCount(0);
    samples.push({ cycle, inputLayouts: trace.events.filter(e => e.name === "node_tree_render_end").length,
      inputSourceReads: trace.sourceReads, inputHistoryReads: trace.historyReads });
  }
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]); expect(errors).toEqual([]);
  await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.destroy());
  await expect(page.locator("[data-quirekit-mind-map],[contenteditable],[data-mind-gesture]")).toHaveCount(0);
  const path = info.outputPath("continuous-work.json");
  await writeFile(path, JSON.stringify({ cycles, durationMs: performance.now() - started, browser: info.project.name, samples }, null, 2));
  await info.attach("continuous-work", { path, contentType: "application/json" });
});
