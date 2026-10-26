import { expect, test } from "./browser";

test("node content participates in layout, SVG rasterization, undo and reopening without external resources", async ({ page }) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  const result = await page.evaluate(async () => {
    const h = window.mindMapHarness, e = h.editors[0]!;
    const canvas = document.createElement("canvas"); canvas.width = 120; canvas.height = 80;
    const context = canvas.getContext("2d")!; context.fillStyle = "#4855ec"; context.fillRect(0, 0, 120, 80);
    e.select("n1"); const before = h.notifications[0]!;
    await e.setDetails({ link: "https://example.com/path", note: "中文\n<script>仅为备注</script>", marker: "priority-1",
      image: { dataUrl: canvas.toDataURL(), width: 120, height: 80, alt: "主题图像" } });
    const details = e.getDetails(), count = h.notifications[0]! - before, source = await e.getDocument(), snapshot = await e.exportSvg();
    const image = new Image(); const url = URL.createObjectURL(new Blob([snapshot.svg], { type: "image/svg+xml" }));
    try { image.src = url; await image.decode(); } finally { URL.revokeObjectURL(url); }
    await e.setDetails({ image: null }); await e.execute("undo");
    return { details, count, source, snapshot, restored: e.getDetails() };
  });
  expect(result.source.version).toBe(5); expect(result.count).toBe(1); expect(result.restored).toEqual(result.details);
  const xml = result.snapshot.svg;
  expect(xml).toContain("data:image/png;base64,"); expect(xml).not.toContain("https://example.com/path");
  expect(xml).not.toContain("<script"); expect(xml).not.toContain("foreignObject");
  await expect(page.locator("#first .smm-node image")).toHaveCount(1);
  await expect(page.locator("#first .smm-node-note")).toHaveCount(1);
  await page.evaluate(async document => { await window.mindMapHarness.mount(1, "second", { document }); }, result.source);
  await expect(page.locator("#second .smm-node image")).toHaveCount(1);
});

test("failed image decoding, stale targets and permission changes leave the complete source untouched", async ({ page }) => {
  await page.goto("/"); await page.evaluate(() => window.mindMapHarness.mount(21));
  const result = await page.evaluate(async () => {
    const e = window.mindMapHarness.editors[0]!; e.select("n1"); const before = await e.getDocument();
    const invalid = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC";
    let rejected = 0;
    for (const operation of [() => e.setDetails({ image: { dataUrl: invalid, width: 10, height: 10, alt: "坏图" } }),
      () => e.setDetails({ note: "迟到" }, ["missing"]), () => e.setDetails({ link: "javascript:alert(1)" })]) {
      try { await operation(); } catch { rejected++; }
    }
    e.setReadOnly(true); try { await e.setDetails({ note: "只读" }, ["n1"]); } catch { rejected++; }
    return { rejected, before, after: await e.getDocument() };
  });
  expect(result.rejected).toBe(4); expect(result.after).toEqual(result.before);
});
