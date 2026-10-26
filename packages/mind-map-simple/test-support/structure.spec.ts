import { expect, test } from "./browser";
import type {} from "./types";

test("all layouts preserve source through sibling/delete/undo and container resize", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  for (const layout of ["mind-map", "logical-left", "logical-right"] as const) {
    const result = await page.evaluate(async (arrangement) => {
      const h = window.mindMapHarness;
      const index = await h.mount(21, "first", { document: { ...h.document(21), layout: arrangement } });
      const editor = h.editors[index]!;
      editor.select("n1"); await editor.execute("add-sibling");
      const inserted = await editor.getDocument();
      const added = inserted.root.children[1]!;
      editor.select(added.id); await editor.execute("remove");
      const removed = await editor.getDocument();
      await editor.execute("undo"); const restored = await editor.getDocument();
      document.getElementById("first")!.style.height = "480px"; await editor.resize();
      const snapshot = await editor.exportSvg(); await editor.destroy();
      return { before: inserted.root.children.map(node => node.id), after: restored.root.children.map(node => node.id),
        removed: removed.root.children.map(node => node.id), layout: restored.layout, width: snapshot.width };
    }, layout);
    expect(result.before).toEqual(result.after);
    expect(result.before).toHaveLength(5); expect(result.removed).toEqual(["n1", "n2", "n3", "n4"]);
    expect(result.layout).toBe(layout); expect(result.width).toBeGreaterThan(100);
  }
  expect(errors).toEqual([]);
});

test("multiline paste stays literal and editing events remain inside the surface", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    await window.mindMapHarness.mount(); window.mindMapHarness.editors[0]!.select("n0");
    await window.mindMapHarness.editors[0]!.execute("edit-text");
    document.body.dataset.outerInputs = "0";
    document.body.addEventListener("input", () => { document.body.dataset.outerInputs = String(Number(document.body.dataset.outerInputs) + 1); });
  });
  const input = page.locator('#first [contenteditable="true"]');
  await input.fill("");
  await input.evaluate(element => {
    const clipboardData = new DataTransfer(); clipboardData.setData("text/plain", "第一行\n第二行 <b>纯文本</b>");
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData }));
  });
  await page.keyboard.press("Enter");
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).root.text)).toBe("第一行\n第二行 <b>纯文本</b>");
  expect(await page.locator("body").getAttribute("data-outer-inputs")).toBe("0");
  await expect(page.locator("#first b")).toHaveCount(0);
});

test("paste preserves intentional trailing lines and participates in native text undo", async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(() => window.mindMapHarness.mount());
  for (const text of ["单行", "尾随换行\n", "两行\n\n"]) {
    await page.evaluate(async () => {
      const editor = window.mindMapHarness.editors[0]!; editor.select("n0"); await editor.execute("edit-text");
    });
    const input = page.locator('#first [contenteditable="true"]'); await input.fill("之前");
    await input.press("ControlOrMeta+A");
    await input.evaluate((element, content) => {
      const clipboardData = new DataTransfer(); clipboardData.setData("text/plain", content);
      element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData }));
    }, text);
    await page.keyboard.press("ControlOrMeta+z"); await expect(input).toHaveText("之前");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    expect(await page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).root.text)).toBe(text);
  }
});
