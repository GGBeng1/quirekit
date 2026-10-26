import { expect, test } from "./browser";
import type {} from "./types";

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount(21));
});

test("native clipboard copies a folded subtree across instances with fresh identities", async ({ page }) => {
  await page.evaluate(async () => {
    const first = window.mindMapHarness.editors[0]!;
    first.select("n1"); await first.execute("toggle-collapse"); first.focus();
    await window.mindMapHarness.mount(1, "second");
    first.focus();
  });
  await page.keyboard.press("ControlOrMeta+c");
  await page.evaluate(() => window.mindMapHarness.editors[1]!.select("n0"));
  await page.keyboard.press("ControlOrMeta+v");
  await expect.poll(() => page.evaluate(async () => (await window.mindMapHarness.editors[1]!.getDocument()).root.children.length)).toBe(1);
  const pasted = await page.evaluate(() => window.mindMapHarness.editors[1]!.getDocument());
  expect(pasted.root.children[0]).toMatchObject({ text: "主题 1 · 本周计划", collapsed: true });
  expect(pasted.root.children[0]?.id).not.toBe("n1");
  expect(pasted.root.children[0]?.children).toHaveLength(4);
  expect(pasted.root.children[0]?.children.map(child => child.id)).not.toContain("n5");
  await page.evaluate(() => window.mindMapHarness.editors[1]!.execute("undo"));
  expect((await page.evaluate(() => window.mindMapHarness.editors[1]!.getDocument())).root.children).toHaveLength(0);
  await page.evaluate(() => window.mindMapHarness.editors[1]!.execute("redo"));
  expect(await page.evaluate(() => window.mindMapHarness.editors[1]!.getDocument())).toEqual(pasted);
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});

test("native cut is atomic and one undo restores the complete subtree", async ({ page }) => {
  const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  await page.evaluate(() => window.mindMapHarness.editors[0]!.select("n1"));
  await page.keyboard.press("ControlOrMeta+x");
  await expect(page.locator("#first .smm-node")).toHaveCount(16);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator("#first .smm-node")).toHaveCount(21);
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(before);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("ControlOrMeta+x");
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(before);
});

test("queued pastes retain their captured parent and each has one history step", async ({ page }) => {
  await page.evaluate(() => {
    const editor = window.mindMapHarness.editors[0]!; editor.select("n0");
    const surface = document.querySelector("#first [data-quirekit-mind-map]")!;
    const data = new DataTransfer(); data.setData("text/plain", "第一条\n第二条");
    for (let i = 0; i < 3; i++) surface.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  });
  const source = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(source.root.children).toHaveLength(10);
  expect(new Set(source.root.children.map(node => node.id)).size).toBe(10);
  expect(source.root.children.slice(4).map(node => node.text)).toEqual(["第一条", "第二条", "第一条", "第二条", "第一条", "第二条"]);
  await page.evaluate(async () => { for (let i = 0; i < 3; i++) await window.mindMapHarness.editors[0]!.execute("undo"); });
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(await page.evaluate(() => window.mindMapHarness.document(21)));
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});

test("empty selection pastes free topics and readonly retains navigation/copy without mutations", async ({ page }) => {
  await page.evaluate(() => window.mindMapHarness.editors[0]!.focus());
  await page.keyboard.press("Escape");
  await page.locator("#first [data-quirekit-mind-map]").evaluate(surface => {
    const data = new DataTransfer(); data.setData("text/plain", "独立想法\n另一个想法");
    surface.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  });
  const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(before.floatingTopics?.map(topic => topic.root.text)).toEqual(["独立想法", "另一个想法"]);
  await page.evaluate(() => { const editor = window.mindMapHarness.editors[0]!; editor.setReadOnly(true); editor.focus(); });
  await page.keyboard.press("Home"); await page.keyboard.press("ControlOrMeta+a");
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getState().selectedCount)).toBe(23);
  const copied = await page.locator("#first [data-quirekit-mind-map]").evaluate(surface => {
    const data = new DataTransfer(); surface.dispatchEvent(new ClipboardEvent("copy", { bubbles: true, cancelable: true, clipboardData: data }));
    surface.dispatchEvent(new ClipboardEvent("cut", { bubbles: true, cancelable: true, clipboardData: data }));
    surface.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
    return JSON.parse(data.getData("application/x-quirekit-mind-map+json"));
  });
  expect(copied.topics).toHaveLength(3);
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(before);
});

test("refused cut and corrupted dedicated payload never remove or partially insert nodes", async ({ page }) => {
  const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  await page.evaluate(() => window.mindMapHarness.editors[0]!.select("n1"));
  await page.locator("#first [data-quirekit-mind-map]").evaluate(surface => {
    const refused = new DataTransfer(); refused.setData = () => { throw new Error("Clipboard denied"); };
    surface.dispatchEvent(new ClipboardEvent("cut", { bubbles: true, cancelable: true, clipboardData: refused }));
    const corrupt = new DataTransfer(); corrupt.setData("application/x-quirekit-mind-map+json", "{invalid");
    corrupt.setData("text/plain", "不应降级插入");
    surface.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: corrupt }));
  });
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(before);
  expect(await page.evaluate(() => window.mindMapHarness.errors.length)).toBe(2);
});
