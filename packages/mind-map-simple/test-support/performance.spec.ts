import { expect, test } from "./browser";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

test("thousand-node marquee performs no document reads, history snapshots or layout during tracking", async ({ page }, info) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => { await window.mindMapHarness.mount(1000); window.mindMapHarness.editors[0]!.setZoom(0.1); });
  const box = (await page.locator("[data-quirekit-mind-map]").boundingBox())!;
  // The host clips its rounded corners. A point only 2 px inside its bounding
  // rectangle is not necessarily inside the canvas's actual pointer surface.
  const start = { x: box.x + 12, y: box.y + 12 };
  const hit = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    return { canvas: Boolean(target?.closest("[data-quirekit-mind-map]")), topic: Boolean(target?.closest(".smm-node")) };
  }, start);
  expect(hit).toEqual({ canvas: true, topic: false });
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.evaluate(() => window.mindMapHarness.trace.start());
  await page.mouse.move(box.x + box.width - 12, box.y + box.height - 12, { steps: 10 });
  await expect.poll(() => page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBeGreaterThan(10);
  await expect(page.locator('[data-mind-gesture="marquee"]')).toBeVisible();
  const selectedCount = await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount);
  const trace = await page.evaluate(() => window.mindMapHarness.trace.read());
  expect(trace.events).toEqual([]); expect(trace.sourceReads).toBe(0); expect(trace.historyReads).toBe(0);
  expect(trace.selectionUpdates).toBeLessThanOrEqual(10);
  await page.mouse.up();
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(selectedCount);
  await expect(page.locator("[data-mind-gesture]")).toHaveCount(0);
  await writeFile(info.outputPath("marquee-work.json"), JSON.stringify({ hit, selectedCount, ...trace }, null, 2));
});

test("records 100/500/1000 node initialization, command and full SVG baselines", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  const measurements = [];
  for (const size of [100, 500, 1000]) {
    measurements.push(await page.evaluate(async (count) => {
      const h = window.mindMapHarness; const start = performance.now();
      const index = await h.mount(count); const editor = h.editors[index]!;
      const mounted = performance.now(); editor.select("n0");
      await editor.execute("add-child"); const edited = performance.now();
      const source = await editor.getDocument();
      const queue = [source.root]; let total = 0;
      while (queue.length) { const node = queue.pop()!; total++; queue.push(...node.children); }
      const exportStart = performance.now(); const snapshot = await editor.exportSvg(); const exported = performance.now();
      const svgNodeCount = new DOMParser().parseFromString(snapshot.svg, "image/svg+xml").querySelectorAll(".smm-node").length;
      await editor.destroy();
      return { count, nodesAfterEdit: total, svgNodeCount, mountMs: mounted - start, editMs: edited - mounted,
        exportMs: exported - exportStart, svgBytes: new TextEncoder().encode(snapshot.svg).length,
        width: snapshot.width, height: snapshot.height };
    }, size));
  }
  expect(measurements.map(row => row.nodesAfterEdit)).toEqual([101, 501, 1001]);
  expect(measurements.map(row => row.svgNodeCount)).toEqual([101, 501, 1001]);
  expect(errors).toEqual([]);
  const path = info.outputPath("baseline.json");
  await writeFile(path, JSON.stringify({ recordedAt: new Date().toISOString(),
    browser: await page.evaluate(() => navigator.userAgent), measurements }, null, 2));
  await info.attach("baseline", { path, contentType: "application/json" });
});

test("records live input layout for 100/500/1000 nodes without serializing the source", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  const measurements = [];
  for (const size of [100, 500, 1000]) {
    await page.evaluate(async count => {
      const h = window.mindMapHarness; const index = await h.mount(count);
      const editor = h.editors[index]!;
      editor.setZoom(1); await editor.center(); editor.select("n0"); await editor.execute("edit-text");
    }, size);
    const input = page.locator('#first [contenteditable="true"]');
    const samples = [];
    for (let sample = 0; sample < 5; sample++) {
      await page.evaluate(() => window.mindMapHarness.trace.start());
      const value = `原位输入性能第 ${sample + 1} 次${"中文".repeat(sample + 1)}`;
      await input.fill(value);
      await expect.poll(() => page.evaluate(() => window.mindMapHarness.trace.read().events.filter(event => event.name === "node_tree_render_end").length)).toBe(1);
      const trace = await page.evaluate(() => {
        window.mindMapHarness.trace.stop(); return window.mindMapHarness.trace.read();
      });
      expect(trace.sourceReads).toBe(0);
      expect(trace.events.map(event => event.name)).toEqual(["node_text_edit_change", "node_tree_render_start", "node_tree_render_end"]);
      samples.push({ inputToLayoutMs: trace.events[2]!.time - trace.events[0]!.time,
        layoutMs: trace.events[2]!.time - trace.events[1]!.time, renderPasses: 1, sourceReads: trace.sourceReads });
      await expect(input).toHaveText(value);
    }
    const final = await page.evaluate(async () => {
      const h = window.mindMapHarness, editor = h.editors.at(-1)!;
      const changesDuringInput = h.notifications.at(-1);
      const source = await editor.getDocument(); await editor.destroy();
      return { changesDuringInput, text: source.root.text };
    });
    expect(final.changesDuringInput).toBe(0);
    expect(final.text).toBe("原位输入性能第 5 次中文中文中文中文中文");
    measurements.push({ count: size, samples });
  }
  expect(errors).toEqual([]);
  const path = info.outputPath("inline-input-baseline.json");
  await writeFile(path, JSON.stringify({ recordedAt: new Date().toISOString(),
    browser: await page.evaluate(() => navigator.userAgent), measurements }, null, 2));
  await info.attach("inline-input-baseline", { path, contentType: "application/json" });
});
