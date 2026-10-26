import { expect, test } from "./browser";

test("annotations follow structure, preserve source and remain inside complete SVG bounds", async ({ page }, info) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  const source = await page.evaluate(async () => {
    const h = window.mindMapHarness, editor = h.editors[0]!;
    await editor.putAnnotation({ id: "relation", kind: "relation", from: "n1", to: "n3", text: "先后关系", color: "#cc3344" });
    await editor.putAnnotation({ id: "boundary", kind: "boundary", topicIds: ["n2"], text: "阶段边界" });
    await editor.putAnnotation({ id: "summary", kind: "summary", topicIds: ["n5", "n6"], text: "要点归纳" });
    editor.select("n1"); await editor.format({ shape: "ellipse" });
    for (const layout of ["logical-left", "logical-right", "mind-map"] as const) await editor.setLayout(layout);
    await editor.fit(); return editor.getDocument();
  });
  const marks = page.locator("#first [data-qk-mind-annotation]"); await expect(marks).toHaveCount(3);
  await page.screenshot({ path: info.outputPath("annotations.png") });
  expect(source.version).toBe(4); expect(source.annotations).toHaveLength(3);
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness, e = h.editors[0]!;
    const before = h.notifications[0]!; await e.removeAnnotation("summary"); await e.execute("undo");
    const restored = e.getAnnotations(), changes = h.notifications[0]! - before;
    const snapshot = await e.exportSvg(); const img = new Image();
    const url = URL.createObjectURL(new Blob([snapshot.svg], { type: "image/svg+xml" }));
    try { img.src = url; await img.decode(); } finally { URL.revokeObjectURL(url); }
    const entries = [...document.querySelectorAll<SVGGElement>("#first [data-qk-mind-annotation]")];
    const bounds = document.querySelector<SVGGElement>("#first .smm-container")!.getBBox();
    return { restored, changes, snapshot, bounded: entries.every(element => { const box = element.getBBox();
      return box.x >= bounds.x && box.y >= bounds.y && box.x + box.width <= bounds.x + bounds.width + 0.01 && box.y + box.height <= bounds.y + bounds.height + 0.01; }) };
  });
  expect(result.restored).toEqual(source.annotations); expect(result.changes).toBe(2); expect(result.bounded).toBe(true);
  for (const text of ["先后关系", "阶段边界", "要点归纳", "#cc3344"]) expect(result.snapshot.svg).toContain(text);
  await page.evaluate(async document => { await window.mindMapHarness.mount(1, "second", { document }); }, source);
  await expect(page.locator("#second [data-qk-mind-annotation]")).toHaveCount(3);
  await page.evaluate(async () => {
    const e = window.mindMapHarness.editors[0]!; e.select("n1"); await e.execute("toggle-collapse");
  });
  await expect(page.locator('#first [data-qk-mind-annotation="summary"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getAnnotations())).toHaveLength(3);
});

test("annotation layers do no work for selection/viewport frames and honor edit permissions", async ({ page }) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness, e = h.editors[0]!;
    const relation = { id: "r", kind: "relation" as const, from: "n1", to: "n3", text: "关联" };
    await e.putAnnotation(relation);
    let mutations = 0; const observer = new MutationObserver(records => { mutations += records.length; });
    for (const element of document.querySelectorAll("#first [data-qk-mind-annotations]")) observer.observe(element, { childList: true, subtree: true });
    h.trace.start(); for (let i = 0; i < 10; i++) { e.select(i % 2 ? "n1" : "n3", false); e.getAnnotations(); e.setZoom(0.9 + i / 100); }
    await new Promise(requestAnimationFrame); const trace = h.trace.read(); h.trace.stop(); observer.disconnect();
    const selected = e.getSelectedTopicIds();
    e.setReadOnly(true); let denied = false; try { await e.putAnnotation({ ...relation, text: "禁止" }); } catch { denied = true; }
    return { mutations, trace, denied, selected, entries: e.getAnnotations() };
  });
  expect(result.mutations).toBe(0); expect(result.trace.sourceReads).toBe(0); expect(result.trace.historyReads).toBe(0);
  expect(result.denied).toBe(true); expect(result.entries[0]!.text).toBe("关联"); expect(result.selected).toEqual(["n1"]);
});
