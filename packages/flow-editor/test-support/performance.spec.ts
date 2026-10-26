import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {} from "./types";

test("100/500/1000 connected shapes: live drag/nudge, source-read bounds and export budget", async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("button", { name: "插入处理", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "画布缩略图", exact: true }).click();
  await page.getByRole("button", { name: "查找图形", exact: true }).click();
  await page.getByRole("textbox", { name: "查找画布文字" }).fill("节点");
  const measurements = [];
  for (const count of [100, 500, 1000]) {
    const mount = await page.evaluate(async count => {
      const editor = window.flowFixture.editor(), source = await editor.getDocument();
      const template = source.nodes[1]!, edge = source.edges[0]!;
      const nodes = Array.from({ length: count }, (_, i) => ({ ...template, id: `n${i}`, text: `节点 ${i}`, x: (i % 20) * 240, y: Math.floor(i / 20) * 130 }));
      const edges = nodes.slice(1).map((n, i) => ({ ...edge, id: `e${i}`, source: { node: `n${i}`, port: "right" as const }, target: { node: n.id, port: "left" as const }, routing: "straight" as const }));
      const started = performance.now(); editor.replaceDocument({ ...source, nodes, edges }); editor.setZoom(1);
      return performance.now() - started;
    }, count);
    // The fixture viewport is moved through the public fit/zoom controls, then the
    // node's real visible geometry is sampled after each physical mouse step.
    await page.evaluate(() => window.flowFixture.editor().fit());
    const visible = page.locator('.x6-node[data-cell-id="n0"]');
    const bounds = (await visible.boundingBox())!, times: number[] = [];
    await expect(page.locator("[data-overview-node]")).toHaveCount(count);
    await expect(page.getByRole("region", { name: "查找图形" })).toContainText(`找到 ${count} 个图形`);
    const miniStart = Number(await page.locator('[data-overview-node="n0"]').getAttribute("x"));
    const readsBefore = await page.evaluate(() => {
      const original = window.flowFixture.editor().getDocument;
      let reads = 0;
      window.flowFixture.editor().getDocument = () => { reads++; return original(); };
      const previous = window as unknown as { flowOverviewStop?: () => void }; previous.flowOverviewStop?.();
      const changed = new Set<string>(), observer = new MutationObserver(records => records.forEach(record => { const id = (record.target as Element).getAttribute("data-overview-node"); if (id) changed.add(id); }));
      observer.observe(document.querySelector("[data-overview-node]")!.parentElement!, { subtree: true, attributes: true });
      const originalSearch = window.flowFixture.editor().searchNodes; let searches = 0;
      window.flowFixture.editor().searchNodes = (...args) => { searches++; return originalSearch(...args); };
      Object.assign(window, { flowReadCount: () => reads, flowSearchCount: () => searches, flowOverviewChanges: () => [...changed], flowOverviewStop: () => observer.disconnect() });
      return reads;
    });
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
    for (let step = 1; step <= 5; step++) {
      const start = Date.now(); await page.mouse.move(bounds.x + bounds.width / 2 + step * 8, bounds.y + bounds.height / 2 + step * 3);
      expect(Number(await page.locator('[data-overview-node="n0"]').getAttribute("x"))).toBeGreaterThan(miniStart);
      const current = (await visible.boundingBox())!; expect(current.x).toBeGreaterThan(bounds.x + step * 4); times.push(Date.now() - start);
    }
    await page.mouse.up();
    const reads = await page.evaluate(() => (window as unknown as { flowReadCount(): number }).flowReadCount());
    expect(reads).toBe(readsBefore);
    const before = await page.evaluate(async () => { const e = window.flowFixture.editor(); e.select(["n0"]); e.focus(); return { document: await e.getDocument(), scale: e.getState().scale }; });
    const readStart = await page.evaluate(() => (window as unknown as { flowReadCount(): number }).flowReadCount());
    const nudgeBox = (await visible.boundingBox())!, nudgeTimes: number[] = [];
    // Repeat keydown keeps one native history batch. Inspect every painted step,
    // then check both the committed source and one-step undo independently.
    for (let step = 1; step <= 5; step++) {
      const start = Date.now(); await page.keyboard.down("ArrowRight");
      await expect.poll(async () => (await visible.boundingBox())!.x).toBeCloseTo(nudgeBox.x + step * before.scale, 1);
      nudgeTimes.push(Date.now() - start);
    }
    await page.keyboard.up("ArrowRight");
    const nudgeReads = await page.evaluate(() => (window as unknown as { flowReadCount(): number }).flowReadCount()) - readStart;
    expect(nudgeReads).toBe(0);
    const navigation = await page.evaluate(() => { const w = window as unknown as { flowSearchCount(): number; flowOverviewChanges(): string[] }; return { fullSearchesDuringGestures: w.flowSearchCount(), overviewNodesChanged: w.flowOverviewChanges() }; });
    expect(navigation).toEqual({ fullSearchesDuringGestures: 0, overviewNodesChanged: ["n0"] });
    const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
    expect(after.nodes[0]!.x).toBeCloseTo(before.document.nodes[0]!.x + 5);
    expect(after.nodes.slice(1)).toEqual(before.document.nodes.slice(1));
    await page.keyboard.press("ControlOrMeta+z"); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before.document);
    const output = await page.evaluate(async () => {
      const e = window.flowFixture.editor(), start = performance.now(), svg = await e.exportSvg(), exportSvgMs = performance.now() - start;
      const png = await e.exportPng(), image = new Image(); image.src = png; await image.decode();
      return { exportSvgMs: Math.round(exportSvgMs), svgBytes: new Blob([svg.svg]).size,
        sourceNodes: JSON.parse(svg.source).nodes.length, width: svg.width, height: svg.height, pngWidth: image.width, pngHeight: image.height };
    });
    expect(output.sourceNodes).toBe(count); expect(output.svgBytes).toBeGreaterThan(1000);
    expect(output.pngWidth).toBeLessThanOrEqual(8192); expect(output.pngHeight).toBeLessThanOrEqual(8192); expect(output.pngWidth * output.pngHeight).toBeLessThanOrEqual(16e6);
    measurements.push({ nodes: count, edges: count - 1, mountMs: Math.round(mount), dragRoundTripMs: times,
      ...navigation, publicSourceReadsDuringDrag: reads, nudgeRoundTripMs: nudgeTimes, publicSourceReadsDuringNudge: nudgeReads, ...output });
  }
  await writeFile(info.outputPath("performance.json"), JSON.stringify(measurements, null, 2));
  console.log(JSON.stringify(measurements));
});
