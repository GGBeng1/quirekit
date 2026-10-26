import { expect, test } from "./browser";
import type {} from "./types";

test("every layout preserves independent direction, source, geometry and connector ownership", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  for (const layout of ["mind-map", "logical-left", "logical-right"] as const) {
    const result = await page.evaluate(async arrangement => {
      const h = window.mindMapHarness;
      const source = { ...h.document(5), version: 2 as const, layout: arrangement, floatingTopics: [
        { root: { id: "free-r", text: "独立向右", collapsed: false, children: [{ id: "child-r", text: "右子主题", collapsed: false, children: [] }] },
          position: { x: 0, y: 150 }, side: "right" as const },
        { root: { id: "free-l", text: "独立向左", collapsed: false, children: [{ id: "child-l", text: "左子主题", collapsed: false, children: [] }] },
          position: { x: -300, y: -150 }, side: "left" as const },
      ] };
      const index = await h.mount(5, "first", { document: source }), e = h.editors[index]!;
      /** @param text - Visible label. @returns World-space label position. */
      function at(text: string) {
        const element = [...document.querySelectorAll("#first .smm-node text")].find(n => n.textContent === text)!;
        const rect = element.getBoundingClientRect(), state = e.getState();
        return { x: (rect.x - state.x) / state.scale, y: (rect.y - state.y) / state.scale };
      }
      const mainBefore = at("主题 1 · 本周计划"), rootBefore = at("时间管理");
      const right = at("右子主题").x > at("独立向右").x, left = at("左子主题").x < at("独立向左").x;
      const saved = await e.getDocument(), svg = await e.exportSvg();
      const image = new DOMParser().parseFromString(svg.svg, "image/svg+xml");
      const edges = [...image.querySelectorAll(".smm-line-container path")].filter(path => path.getAttribute("d")?.trim()).length;
      e.select("free-r"); await e.execute("remove"); e.select("free-l"); await e.execute("remove");
      const mainAfter = at("主题 1 · 本周计划"), rootAfter = at("时间管理");
      const spacingDifference = { x: mainAfter.x - rootAfter.x - (mainBefore.x - rootBefore.x), y: mainAfter.y - rootAfter.y - (mainBefore.y - rootBefore.y) };
      await e.destroy(); return { source, saved, right, left, edges, count: image.querySelectorAll(".smm-node").length, spacingDifference };
    }, layout);
    expect(result.saved).toEqual(result.source); expect(result.right).toBe(true); expect(result.left).toBe(true);
    expect(result.count).toBe(9); expect(result.edges).toBe(6);
    expect(result.spacingDifference.x).toBeCloseTo(0, 3); expect(result.spacingDifference.y).toBeCloseTo(0, 3);
  }
  expect(errors).toEqual([]);
});

test("cancel, readonly, IME and disposal do not commit incomplete drags", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => { await window.mindMapHarness.mount(5); await window.mindMapHarness.mount(5, "second"); });
  const branch = page.locator("#first .smm-node").filter({ hasText: /^主题 1 · 本周计划$/ });
  const rect = (await branch.boundingBox())!;
  for (const action of ["escape", "readonly", "dispose"] as const) {
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 + 100, { steps: 5 });
    await expect(page.locator('[data-mind-gesture="drag"]')).toBeVisible();
    if (action === "escape") await page.keyboard.press("Escape");
    else if (action === "readonly") await page.evaluate(() => window.mindMapHarness.editors[0]!.setReadOnly(true));
    else await page.evaluate(() => window.mindMapHarness.editors[0]!.destroy());
    await page.mouse.up(); await expect(page.locator("[data-mind-gesture]")).toHaveCount(0);
    expect(await page.evaluate(() => window.mindMapHarness.notifications)).toEqual([0, 0]);
    if (action === "readonly") await page.evaluate(() => window.mindMapHarness.editors[0]!.setReadOnly(false));
  }
  await page.evaluate(async () => { const e = window.mindMapHarness.editors[1]!; e.select("n0"); await e.execute("edit-text"); });
  const input = page.locator('#second [contenteditable="true"]');
  await input.dispatchEvent("compositionstart", { data: "" });
  const second = (await page.locator("#second").boundingBox())!;
  await page.mouse.move(second.x + 10, second.y + 10); await page.mouse.down();
  await page.mouse.move(second.x + 120, second.y + 100, { steps: 5 }); await page.mouse.up();
  await expect(input).toBeVisible(); await expect(page.locator("[data-mind-gesture]")).toHaveCount(0);
  expect(await page.evaluate(() => window.mindMapHarness.editors[1]!.getState().composing)).toBe(true);
  await input.dispatchEvent("compositionend", { data: "" });
  expect(errors).toEqual([]);
});

test("modifier multi-selection detaches topmost subtrees once and undoes atomically", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount());
  const nodes = page.locator("#first .smm-node");
  await nodes.filter({ hasText: /^主题 1 · 本周计划$/ }).click();
  await nodes.filter({ hasText: /^主题 5 · 本周计划$/ }).click({ modifiers: ["ControlOrMeta"] });
  await nodes.filter({ hasText: /^主题 3 · 本周计划$/ }).click({ modifiers: ["Shift"] });
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(3);
  const rect = (await nodes.filter({ hasText: /^主题 1 · 本周计划$/ }).boundingBox())!;
  const area = (await page.locator("#first").boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down();
  await page.mouse.move(area.x + area.width - 60, area.y + area.height - 40, { steps: 6 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).floatingTopics?.length)).toBe(2);
  const current = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(current.floatingTopics!.map(t => t.root.id)).toEqual(["n1", "n3"]);
  expect(current.floatingTopics![0]!.root.children.map(t => t.id)).toContain("n5");
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("undo"));
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).version)).toBe(1);
});
