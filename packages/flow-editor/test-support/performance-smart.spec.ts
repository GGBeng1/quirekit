import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { mountSmartGraph } from "./performance/fixture";
import { observeWork, observedWork } from "./performance/observer";
import type {} from "./performance/types";

for (const selected of [false, true]) test(`100/500/1000 smart routes: every drag frame, deferred unrelated paths and no whole-source work (${selected ? "selected overlay" : "native body with alignment"})`, async ({ page }, info) => {
  test.setTimeout(180_000);
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "画布缩略图", exact: true }).click();
  await page.getByRole("button", { name: "查找图形", exact: true }).click(); await page.getByRole("textbox", { name: "查找画布文字" }).fill("节点");
  const measurements = [];
  try {
    for (const count of [100, 500, 1000]) {
      const mountMs = await mountSmartGraph(page, count), node = page.locator('.x6-node[data-cell-id="n0"]');
      await expect(page.locator("[data-overview-node]")).toHaveCount(count);
      if (selected) await page.evaluate(() => window.flowFixture.editor().select(["n0"]));
      const before = await page.evaluate(() => window.flowFixture.editor().getDocument()), bounds = (await node.boundingBox())!;
      await observeWork(page);
      const times = [], frames = [];
      let previousPaths = 0;
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
      for (let step = 1; step <= 5; step++) {
        const started = Date.now(); await page.mouse.move(bounds.x + bounds.width / 2 + step * 10, bounds.y + bounds.height / 2 + step * 5);
        await expect.poll(async () => (await node.boundingBox())!.x).toBeGreaterThan(bounds.x + step * 5);
        const aligned = await page.locator('.x6-widget-snapline line[display="inherit"]').count() > 0;
        const work = await observedWork(page), paths = (work.paths.e0 ?? 0) - previousPaths;
        frames.push({ x: (await node.boundingBox())!.x, aligned, edgeUpdates: paths, ...work }); times.push(Date.now() - started);
        expect(work.sourceReads).toBe(0); expect(work.serializations).toBe(0); expect(work.searches).toBe(0);
        expect(Object.keys(work.paths).filter(id => id !== "e0")).toEqual([]);
        // A native Snapline correction follows the original position write.
        // Admit that second adjacent-path update only with a visible guide;
        // ordinary/selection movement still has exactly one update per input.
        expect(paths).toBeGreaterThanOrEqual(1);
        expect(paths).toBeLessThanOrEqual(!selected && aligned ? 2 : 1);
        previousPaths = work.paths.e0 ?? 0;
      }
      const drag = await observedWork(page, true); await page.mouse.up();
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      const drop = await observedWork(page); expect(drop.sourceReads).toBe(0); expect(drop.serializations).toBe(0); expect(drop.searches).toBe(0);
      for (const updates of Object.values(drop.paths)) expect(updates).toBe(1);
      expect(new Set([...drag.overview, ...drop.overview])).toEqual(new Set(["n0"]));
      const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
      expect(after.nodes[0]!.x).toBeGreaterThan(before.nodes[0]!.x); expect(after.nodes.slice(1)).toEqual(before.nodes.slice(1)); expect(after.edges).toEqual(before.edges);
      expect(after.nodes[0]!.image).toEqual(before.nodes[0]!.image);
      await page.evaluate(() => { window.flowWorkProbe!.restore(); window.flowFixture.editor().execute("undo"); }); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
      const output = await page.evaluate(async () => {
        const editor = window.flowFixture.editor(), start = performance.now(), svg = await editor.exportSvg(), exportSvgMs = Math.round(performance.now() - start);
        const png = await editor.exportPng(), image = new Image(); image.src = png; await image.decode();
        return { exportSvgMs, sourceNodes: JSON.parse(svg.source).nodes.length, svgBytes: new Blob([svg.svg]).size, pngWidth: image.width, pngHeight: image.height };
      });
      expect(output.sourceNodes).toBe(count); expect(output.pngWidth).toBeLessThanOrEqual(8192); expect(output.pngHeight).toBeLessThanOrEqual(8192); expect(output.pngWidth * output.pngHeight).toBeLessThanOrEqual(16e6);
      measurements.push({ selected, count, edges: before.edges.length, mountMs, dragRoundTripMs: times, frames, drag, drop, ...output });
    }
    await writeFile(info.outputPath("smart-routing-work.json"), JSON.stringify(measurements, null, 2));
  } finally { await page.evaluate(() => window.flowWorkProbe?.restore()); }
});
