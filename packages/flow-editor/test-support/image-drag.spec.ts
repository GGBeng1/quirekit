import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { observeWork, observedWork } from "./performance/observer";
import type {} from "./types";

/** @param page - Isolated workspace. @param image - Whether to use a substantial cropped PNG. @param selected - Starts on the selection overlay. @param scale - World-to-screen ratio. @param alignment - Places a neighboring edge twelve screen pixels ahead. @returns Settled canonical source. */
async function mount(page: Page, image: boolean, selected: boolean, scale: number, alignment = false) {
  return page.evaluate(async ({ image, selected, scale, alignment }) => {
    const editor = window.flowFixture.editor(), revision = (await editor.getDocument()).revision;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d")!, pixels = context.createImageData(256, 256);
    let seed = 43;
    for (let i = 0; i < pixels.data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      pixels.data[i] = i % 4 === 3 ? 255 : seed >>> 24;
    }
    context.putImageData(pixels, 0, 0);
    const resource = { dataUrl: canvas.toDataURL(), width: 256, height: 256, alt: "Drag regression PNG",
      crop: { top: .1, right: .1, bottom: .15, left: .2 }, fit: "cover" as const, lockAspectRatio: true };
    const decoded = new Image(); decoded.src = resource.dataUrl; await decoded.decode();
    const node = { id: "moving", text: "", x: -53, y: -57, width: 90, height: 90, style: {} };
    editor.replaceDocument({ format: "quirekit-flowchart", version: 1, revision,
      nodes: [image ? { ...node, shape: "image", image: resource } : { ...node, shape: "rectangle" },
        { id: "neighbor", shape: "rectangle", text: "Connected", x: alignment ? node.x + node.width + 12 / scale : 270, y: 240, width: 120, height: 70, style: {} }],
      edges: [{ id: "connected", source: { node: "moving", port: "right" }, target: { node: "neighbor", port: "left" }, vertices: [], routing: "straight", label: "", labelPosition: .5, style: {} }] });
    editor.fit(); editor.setZoom(scale); editor.select(selected ? ["moving"] : []);
    return editor.getDocument();
  }, { image, selected, scale, alignment });
}

const scenarios = [
  ...[.5, 1, 1.5].flatMap(scale => [false, true].map(selected => ({ image: true, scale, selected }))),
  { image: false, scale: 1, selected: true },
];
for (const scenario of scenarios) test(`${scenario.image ? "PNG" : "rectangle"}: fine dragging follows each pointer step at ${scenario.scale * 100}% (${scenario.selected ? "selected overlay" : "node body"})`, async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("application", { name: "流程图编辑区" })).toBeVisible();
  const before = await mount(page, scenario.image, scenario.selected, scenario.scale);
  const node = page.locator('.x6-node[data-cell-id="moving"]'), body = node.locator("path").first();
  const initial = (await body.boundingBox())!, start = { x: initial.x + initial.width / 2, y: initial.y + initial.height / 2 };
  if (scenario.image) expect(before.nodes[0]!.image!.dataUrl.length).toBeGreaterThan(150_000);
  if (scenario.selected) await expect(page.locator('.x6-widget-selection-box[data-cell-id="moving"]')).toBeVisible();
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await observeWork(page);
  const resourceProbe = await node.evaluateHandle(element => {
    const image = element.querySelector("image"), state = { image, changes: 0 };
    const observer = new MutationObserver(records => {
      for (const record of records) if (record.target === image || [...record.removedNodes].includes(image!)) state.changes++;
    });
    observer.observe(element, { attributes: true, childList: true, subtree: true });
    return { state, observer, element };
  });
  const frames = [], inputs = [...Array.from({ length: 18 }, (_, i) => (i + 1) * 2), ...Array.from({ length: 21 }, (_, i) => 34 - i * 2)];
  try {
    // Observe the actual paint after every small native move, before sending the next point.
    // A final-state-only assertion would miss the invisible ten-unit snapping regression.
    for (const [index, input] of inputs.entries()) {
      // Take a distinct return trajectory: X6's native node view suppresses an
      // event exactly at the mouse-down point, independently of grid precision.
      const vertical = input / 2 + (index < 18 ? 0 : 4);
      const started = Date.now(); await page.mouse.move(start.x + input, start.y + vertical);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      const bounds = (await body.boundingBox())!;
      frames.push({ input, vertical, x: bounds.x - initial.x, y: bounds.y - initial.y, roundTripMs: Date.now() - started });
    }
    await page.mouse.up();
    const work = await observedWork(page), resource = await resourceProbe.evaluate(probe => ({ changes: probe.state.changes, sameImage: probe.element.querySelector("image") === probe.state.image }));
    await writeFile(info.outputPath("image-drag-work.json"), JSON.stringify({ ...scenario, frames, work, resource }, null, 2));
    expect(work.sourceReads).toBe(0); expect(work.serializations).toBe(0); expect(work.searches).toBe(0);
    expect(resource.changes).toBe(0); expect(resource.sameImage).toBe(true);
    expect(Object.keys(work.paths)).toEqual(["connected"]);
    for (const [index, frame] of frames.entries()) {
      expect(Math.abs(frame.x - frame.input), `horizontal tracking at input ${frame.input}`).toBeLessThanOrEqual(scenario.scale + .1);
      expect(Math.abs(frame.y - frame.vertical), `vertical tracking at input ${frame.input}`).toBeLessThanOrEqual(scenario.scale + .1);
      expect(Math.abs(frame.x - (frames[index - 1]?.x ?? 0)), `painted progress at input ${frame.input}`).toBeGreaterThan(.25);
    }
    await page.evaluate(() => window.flowWorkProbe!.restore());
    const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
    expect(Math.abs((after.nodes[0]!.x - before.nodes[0]!.x) * scenario.scale - inputs.at(-1)!)).toBeLessThanOrEqual(scenario.scale + .1);
    expect(Math.abs((after.nodes[0]!.y - before.nodes[0]!.y) * scenario.scale - frames.at(-1)!.vertical)).toBeLessThanOrEqual(scenario.scale + .1);
    expect({ ...after.nodes[0], x: before.nodes[0]!.x, y: before.nodes[0]!.y }).toEqual(before.nodes[0]); expect(after.nodes.slice(1)).toEqual(before.nodes.slice(1)); expect(after.edges).toEqual(before.edges);
    await page.evaluate(() => window.flowFixture.editor().execute("undo")); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
    await page.evaluate(() => window.flowFixture.editor().execute("redo")); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(after);
  } finally {
    await page.mouse.up(); await page.evaluate(() => window.flowWorkProbe?.restore());
    await resourceProbe.evaluate(probe => probe.observer.disconnect()); await resourceProbe.dispose();
  }
});

for (const scale of [.5, 1, 1.5]) test(`PNG alignment at ${scale * 100}%: narrow screen tolerance still snaps and releases`, async ({ page }, info) => {
  await page.goto("/"); await expect(page.getByRole("application", { name: "流程图编辑区" })).toBeVisible();
  const before = await mount(page, true, false, scale, true), body = page.locator('.x6-node[data-cell-id="moving"] path').first();
  const initial = (await body.boundingBox())!, start = { x: initial.x + initial.width / 2, y: initial.y + initial.height / 2 };
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await observeWork(page);
  const frames = [];
  try {
    for (const input of [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]) {
      await page.mouse.move(start.x + input, start.y + input / 2);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      const bounds = (await body.boundingBox())!, guide = await page.evaluate(() => document.querySelector(".x6-widget-snapline-vertical")?.getAttribute("display") === "inherit");
      frames.push({ input, x: bounds.x - initial.x, guide });
    }
    await page.mouse.up(); const work = await observedWork(page);
    await writeFile(info.outputPath("alignment-drag-work.json"), JSON.stringify({ scale, frames, work }, null, 2));
    for (const frame of frames) {
      if (frame.input === 10 || frame.input === 12 || frame.input === 14) { expect(frame.x).toBeCloseTo(12, 1); expect(frame.guide).toBe(true); }
      else { expect(Math.abs(frame.x - frame.input)).toBeLessThanOrEqual(scale + .1); expect(frame.guide).toBe(false); }
    }
    expect(work.sourceReads).toBe(0); expect(work.serializations).toBe(0); expect(work.searches).toBe(0);
    await page.evaluate(() => window.flowWorkProbe!.restore());
    const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
    expect(Math.abs((after.nodes[0]!.x - before.nodes[0]!.x) * scale - 24)).toBeLessThanOrEqual(scale + .1);
    expect(after.nodes[0]!.image).toEqual(before.nodes[0]!.image); expect(after.nodes.slice(1)).toEqual(before.nodes.slice(1));
    await page.evaluate(() => window.flowFixture.editor().execute("undo")); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  } finally { await page.mouse.up(); await page.evaluate(() => window.flowWorkProbe?.restore()); }
});
