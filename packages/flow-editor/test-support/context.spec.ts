import { expect, test, type Page } from "@playwright/test";
import "./types";
/** @param page - Private test canvas. @returns Completion of fixture setup. */
async function setup(page: Page): Promise<void> {
  await page.goto("/"); await expect(page.getByRole("button", { name: "图表", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
      { id: "a", shape: "process", x: 100, y: 100, width: 160, height: 100, text: "需求", style: {} },
      { id: "b", shape: "process", x: 400, y: 100, width: 160, height: 100, text: "设计", style: {} },
    ], edges: [{ id: "ab", source: { node: "a" }, target: { node: "b" }, vertices: [{ x: 300, y: 200 }], routing: "orthogonal", label: "", labelPosition: 0.5, style: {} }] }); e.fit();
  });
}
test("right click resolves target, keeps multiselection, groups and returns keyboard focus", async ({ page }, info) => {
  await setup(page);
  const node = page.locator('.x6-node[data-cell-id="a"]');
  await node.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "图形操作", exact: true }); await expect(menu).toBeVisible();
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["a"]);
  await page.screenshot({ path: info.outputPath("context-light.png") });
  await page.keyboard.press("Escape"); await expect(page.getByRole("application")).toBeFocused();
  await page.evaluate(() => window.flowFixture.editor().select(["a", "b"]));
  const box = (await node.boundingBox())!; await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  await expect(menu).toBeVisible();
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["a", "b"]);
  await page.getByRole("menuitem", { name: /^组合/ }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes.filter(n => n.shape === "group")).toHaveLength(1);
  await page.keyboard.press("Shift+F10"); await expect(menu).toBeVisible();
  await page.getByRole("menuitem", { name: /^锁定/ }).click();
  await page.keyboard.press("Shift+F10"); await expect(page.getByRole("menuitem", { name: /^删除/ })).toBeDisabled();
  await page.getByRole("menuitem", { name: /^解锁/ }).click();
  await page.getByRole("button", { name: "切换明暗主题" }).click();
  await page.evaluate(() => window.flowFixture.editor().focus()); await page.keyboard.press("Shift+F10");
  await page.screenshot({ path: info.outputPath("context-dark.png") });
  await page.keyboard.press("Escape");
});
test("held arrows move continuously at world scale with one undo and native text ownership", async ({ page }) => {
  await setup(page); await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["a", "b"]); e.setZoom(0.5); e.focus(); });
  const before = await page.evaluate(() => window.flowFixture.editor().getDocument());
  const positions: number[] = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.down("ArrowRight"); positions.push((await page.locator('.x6-node[data-cell-id="a"]').boundingBox())!.x); }
  await page.keyboard.up("ArrowRight"); expect(positions.every((x, i) => !i || x > positions[i - 1]!)).toBe(true);
  const after = await page.evaluate(() => window.flowFixture.editor().getDocument());
  expect(after.nodes[0]!.x).toBe(before.nodes[0]!.x + 4); expect(after.edges[0]!.vertices[0]!.x).toBe(304);
  await page.keyboard.press("ControlOrMeta+z"); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(before);
  await page.keyboard.press("Shift+ArrowDown"); expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.y).toBe(110);
  await page.evaluate(() => { const e = window.flowFixture.editor(); e.select(["a"]); e.execute("edit-text"); });
  const input = page.getByRole("textbox", { name: "图形文字" }); await input.fill("中文光标"); await input.press("ArrowLeft"); await input.press("Shift+ArrowRight");
  await input.press("ControlOrMeta+Enter"); expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes[0]!.x).toBe(100);
  await page.getByRole("button", { name: "切换只读" }).click(); await page.evaluate(() => window.flowFixture.editor().focus());
  const locked = await page.evaluate(() => window.flowFixture.editor().getDocument()); await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(locked);
});
test("blank context and outside focus are independent from graph actions", async ({ page }) => {
  await setup(page); await page.getByRole("application").click({ position: { x: 20, y: 20 }, button: "right" });
  await expect(page.getByRole("menu", { name: "图形操作", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /^删除/ })).toBeDisabled();
  await page.getByRole("textbox", { name: "搜索图形" }).click(); await expect(page.getByRole("textbox", { name: "搜索图形" })).toBeFocused();
  await expect(page.getByRole("menu", { name: "图形操作", exact: true })).toBeHidden();
});

test("native select-all keeps its selection and menu when right-clicking gaps in the overlay", async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.flowFixture.editor().focus()); await page.keyboard.press("ControlOrMeta+a");
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), selected = await page.evaluate(() => window.flowFixture.editor().getState().selectedIds);
  expect(selected).toHaveLength(3);
  const bounds = (await page.locator('.x6-node[data-cell-id="a"]').boundingBox())!;
  // This point is in the aggregate selection's empty interior, below the node.
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height + 15, { button: "right" });
  const menu = page.getByRole("menu", { name: "图形操作", exact: true }); await expect(menu).toBeVisible();
  await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(selected);
  await expect(menu).toBeVisible(); await expect(page.getByRole("menuitem", { name: /^删除/ })).toBeEnabled();
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
  await page.keyboard.press("Escape"); await expect(page.getByRole("application")).toBeFocused();
  // A blank canvas context also preserves an established selection.
  await page.getByRole("application").click({ position: { x: 10, y: 10 }, button: "right" });
  await expect(menu).toBeVisible(); expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(selected);
  await page.getByRole("menuitem", { name: /^删除/ }).click();
  expect((await page.evaluate(() => window.flowFixture.editor().getDocument())).nodes).toHaveLength(0);
  await page.keyboard.press("ControlOrMeta+z"); expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
});

test("container background selects its owner while children keep their own hit target", async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const e = window.flowFixture.editor(); e.replaceDocument({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [
      { id: "frame", shape: "container", x: 100, y: 100, width: 460, height: 400, text: "分层", style: {} },
      { id: "child", parent: "frame", shape: "process", x: 180, y: 210, width: 160, height: 80, text: "模块", style: {} },
    ], edges: [] }); e.fit();
  });
  const source = await page.evaluate(() => window.flowFixture.editor().getDocument()), frame = page.locator('.x6-node[data-cell-id="frame"]');
  const bounds = (await frame.boundingBox())!;
  await page.mouse.click(bounds.x + bounds.width - 40, bounds.y + bounds.height - 40);
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["frame"]);
  await page.keyboard.press("Escape");
  await page.locator('.x6-node[data-cell-id="child"]').click();
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["child"]);
  await page.keyboard.press("Escape");
  await page.mouse.click(bounds.x + 25, bounds.y + 25);
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["frame"]);
  await page.mouse.click(bounds.x + bounds.width - 40, bounds.y + bounds.height - 40, { button: "right" });
  await expect(page.getByRole("menu", { name: "图形操作", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.flowFixture.editor().getState().selectedIds)).toEqual(["frame"]);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.flowFixture.editor().getDocument())).toEqual(source);
});
