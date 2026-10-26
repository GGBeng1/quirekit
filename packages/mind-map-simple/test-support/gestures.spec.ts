import { expect, test } from "./browser";
import type {} from "./types";

test("marquee tracks selection during movement without layout, serialization or viewport drift", async ({ page }, info) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => { await window.mindMapHarness.mount(); window.mindMapHarness.editors[0]!.setZoom(0.65); });
  const surface = (await page.locator("#first").boundingBox())!;
  const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getState());
  const nodes = page.locator("#first .smm-node");
  const boxes = await nodes.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, r: rect.right, b: rect.bottom };
  }));
  const left = Math.max(surface.x + 8, Math.min(...boxes.map(b => b.x)) - 12);
  const top = Math.max(surface.y + 8, Math.min(...boxes.map(b => b.y)) - 12);
  await page.mouse.move(left, top); await page.mouse.down();
  await page.evaluate(() => window.mindMapHarness.trace.start());
  await page.mouse.move(Math.max(...boxes.map(b => b.r)) + 12, Math.max(...boxes.map(b => b.b)) + 12, { steps: 8 });
  await expect.poll(() => page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(21);
  await expect(page.locator('[data-mind-gesture="marquee"]')).toBeVisible();
  await page.screenshot({ path: info.outputPath("marquee.png") });
  const during = await page.evaluate(() => ({ state: window.mindMapHarness.editors[0]!.getState(),
    trace: window.mindMapHarness.trace.read(), changes: window.mindMapHarness.notifications[0] }));
  expect(during.state.x).toBe(before.x); expect(during.state.y).toBe(before.y);
  expect(during.trace.events).toEqual([]); expect(during.trace.sourceReads).toBe(0); expect(during.changes).toBe(0);
  expect(during.trace.historyReads).toBe(0); expect(during.trace.selectionUpdates).toBeLessThanOrEqual(9);
  await page.mouse.up(); await expect(nodes.locator(".active")).toHaveCount(0);
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(21);
  await page.keyboard.press("Delete"); await expect(nodes).toHaveCount(1);
  await page.keyboard.press("ControlOrMeta+z"); await expect(nodes).toHaveCount(21);
});

test("root pans, branch detaches with children at the scaled drop point and one undo restores it", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => { await window.mindMapHarness.mount(); window.mindMapHarness.editors[0]!.setZoom(0.75); });
  const node = (text: RegExp) => page.locator("#first .smm-node").filter({ hasText: text });
  const root = node(/^时间管理$/), branch = node(/^主题 1 · 本周计划$/);
  const initialRoot = (await root.boundingBox())!;
  const initialText = (await root.locator("text").first().boundingBox())!;
  await page.mouse.move(initialRoot.x + initialRoot.width / 2, initialRoot.y + initialRoot.height / 2);
  await page.mouse.down(); await page.mouse.move(initialRoot.x + initialRoot.width / 2 + 60, initialRoot.y + initialRoot.height / 2 + 25, { steps: 6 }); await page.mouse.up();
  expect((await root.locator("text").first().boundingBox())!.x - initialText.x).toBeCloseTo(60, 0);
  expect(await page.evaluate(() => window.mindMapHarness.notifications[0])).toBe(0);
  const area = (await page.locator("#first").boundingBox())!;
  const start = (await branch.boundingBox())!;
  const remaining = (await node(/^主题 2 · 本周计划$/).boundingBox())!;
  const rootX = (await root.boundingBox())!.x;
  expect(remaining.x).toBeLessThan(rootX);
  const end = { x: area.x + area.width * 0.65, y: area.y + area.height - 65 };
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2); await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await expect(page.getByText("松开成为自由主题", { exact: true })).toBeVisible();
  await page.mouse.up();
  await expect.poll(() => page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).floatingTopics?.length)).toBe(1);
  const detached = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(detached.floatingTopics![0]!.root.children.map(n => n.id)).toEqual(["n5", "n6", "n7", "n8"]);
  expect(detached.root.children.map(n => n.id)).toEqual(["n2", "n3", "n4"]);
  expect((await node(/^主题 2 · 本周计划$/).boundingBox())!.x).toBeLessThan((await root.boundingBox())!.x);
  const moved = (await branch.boundingBox())!;
  expect(Math.abs(moved.x + moved.width / 2 - end.x)).toBeLessThan(1);
  expect(Math.abs(moved.y + moved.height / 2 - end.y)).toBeLessThan(1);
  await page.screenshot({ path: info.outputPath("detached-subtree.png") });
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("undo"));
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).version)).toBe(1);
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("redo"));
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(detached);
  expect(errors).toEqual([]);
});

test("free topics persist independently, can edit/fold/reattach, and do not reserve main-tree spacing", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    const h = window.mindMapHarness, document = h.document(5);
    await h.mount(5, "first", { document: { ...document, version: 2, floatingTopics: [{
      root: { id: "free", text: "自由主题", collapsed: false, children: [{ id: "free-child", text: "自由子主题", collapsed: false, children: [] }] },
      position: { x: 0, y: 170 }, side: "right",
    }] } });
    h.editors[0]!.setZoom(0.7);
  });
  const free = page.locator("#first .smm-node").filter({ hasText: /^自由主题$/ });
  await expect(free).toBeVisible();
  await free.dblclick(); await page.locator('#first [contenteditable="true"]').fill("独立主题"); await page.keyboard.press("Enter");
  await page.evaluate(async () => {
    const e = window.mindMapHarness.editors[0]!; e.select("free"); await e.execute("toggle-collapse");
  });
  await expect(page.locator("#first .smm-node")).toHaveCount(6);
  const current = await page.evaluate(async () => {
    const e = window.mindMapHarness.editors[0]!, source = await e.getDocument();
    const svg = await e.exportSvg(); await e.destroy();
    await window.mindMapHarness.mount(5, "first", { document: source });
    return { source, svg: svg.svg };
  });
  expect(current.source.floatingTopics![0]!.root.text).toBe("独立主题");
  expect(current.svg).toContain("独立主题");
  const branch = page.locator("#first .smm-node").filter({ hasText: /^主题 1 · 本周计划$/ });
  const moved = page.locator("#first .smm-node").filter({ hasText: /^独立主题/ });
  const a = (await moved.boundingBox())!, b = (await branch.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(async () => (await window.mindMapHarness.editors[1]!.getDocument()).floatingTopics?.length)).toBe(0);
  const attached = await page.evaluate(() => window.mindMapHarness.editors[1]!.getDocument());
  expect(attached.root.children[0]!.children[0]!.children[0]!.id).toBe("free-child");
  expect(errors).toEqual([]);
});
