import { expect, test } from "./browser";
import type {} from "./types";

test.beforeEach(async ({ page }) => {
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.mindMapHarness));
  await page.evaluate(async () => {
    await window.mindMapHarness.mount();
    const editor = window.mindMapHarness.editors[0]!;
    editor.setZoom(1); await editor.center(); editor.select("n0");
  });
});

test("editing uses transparent text in place and restores one visible SVG label", async ({ page }, info) => {
  const root = page.locator("#first .smm-node").filter({ hasText: /^时间管理$/ });
  const before = (await root.locator("text").boundingBox())!;
  await root.dblclick();
  const input = page.locator('#first [contenteditable="true"]');
  await expect(input).toHaveCSS("box-shadow", "none");
  await expect(input).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect(await root.locator("text").evaluate(element => {
    for (let current: Element | null = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.display === "none" || style.opacity === "0" || style.visibility === "hidden") return true;
    }
    return false;
  })).toBe(true);
  const rect = (await input.boundingBox())!;
  expect(Math.abs(rect.x + 5 - before.x)).toBeLessThan(2);
  expect(Math.abs(rect.y + 3 - before.y)).toBeLessThan(2);
  const changes = await page.evaluate(() => window.mindMapHarness.notifications[0]);
  await input.fill("原位中文编辑");
  await input.press("Shift+Enter"); await page.keyboard.insertText("第二行内容");
  await expect.poll(() => page.locator("#first .smm-node text").allTextContents()).toEqual(expect.arrayContaining(["原位中文编辑", "第二行内容"]));
  expect(await page.evaluate(() => window.mindMapHarness.notifications[0])).toBe(changes);
  await page.locator("#first").screenshot({ path: info.outputPath("inline-edit.png") });
  await input.press("Enter");
  const document = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(document.root.text).toBe("原位中文编辑\n第二行内容");
  const committed = page.locator("#first .smm-node text").filter({ hasText: "原位中文编辑" });
  await expect(committed).toHaveCount(1); await expect(committed).toHaveCSS("opacity", "1");
  await expect(input).not.toBeVisible();
});

test("immediate undo and disposal reject delayed text from the previous edit", async ({ page }) => {
  const failures: string[] = []; page.on("pageerror", error => failures.push(error.message));
  const result = await page.evaluate(async () => {
    const editor = window.mindMapHarness.editors[0]!;
    await editor.execute("edit-text");
    const input = document.querySelector<HTMLElement>('#first [contenteditable="true"]')!;
    input.textContent = "不应在撤销后重新出现";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    await editor.execute("undo");
    // Cross the pinned vendor's 100 ms trailing layout callback, not just the command promise.
    await new Promise(resolve => setTimeout(resolve, 250));
    return { source: await editor.getDocument(), text: document.querySelector("#first svg")!.textContent };
  });
  expect(result.source.root.text).toBe("时间管理");
  expect(result.text).toContain("时间管理");
  expect(result.text).not.toContain("不应在撤销后重新出现");
  await page.evaluate(async () => {
    const editor = window.mindMapHarness.editors[0]!;
    editor.select("n0"); await editor.execute("edit-text");
    const input = document.querySelector<HTMLElement>('#first [contenteditable="true"]')!;
    input.textContent = "关闭前最后一次输入";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    await editor.destroy();
    await new Promise(resolve => setTimeout(resolve, 250));
  });
  await expect(page.locator("#first [data-quirekit-mind-map]")).toHaveCount(0);
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => window.mindMapHarness.errors)).toEqual([]);
});

test("root, branch and leaf keep their text after unchanged edits at different zoom levels", async ({ page }) => {
  for (const scale of [0.65, 1.5]) {
    await page.evaluate(async zoom => {
      const editor = window.mindMapHarness.editors[0]!;
      editor.setZoom(zoom); await editor.center();
    }, scale);
    for (const [id, label] of [["n0", "时间管理"], ["n1", "主题 1 · 本周计划"], ["n5", "主题 5 · 本周计划"]] as const) {
      const text = page.locator("#first .smm-node text").filter({ hasText: new RegExp(`^${label}$`) });
      const bounds = (await text.boundingBox())!;
      const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getState());
      await page.evaluate(async nodeId => {
        const editor = window.mindMapHarness.editors[0]!;
        editor.select(nodeId); await editor.execute("edit-text");
      }, id);
      const input = page.locator('#first [contenteditable="true"]');
      await expect(input).toHaveCSS("box-shadow", "none");
      await expect(input).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(input).toHaveText(label);
      const overlay = (await input.boundingBox())!;
      const current = await page.evaluate(() => window.mindMapHarness.editors[0]!.getState());
      // Entering an edge topic can pan it into view. Compare the measured SVG
      // anchor in this editing phase, not a new glyph measurement after commit.
      expect(Math.abs(overlay.x + 5 - bounds.x - current.x + before.x), JSON.stringify({ scale, id, overlay, bounds })).toBeLessThan(2);
      expect(Math.abs(overlay.y + 3 - bounds.y - current.y + before.y)).toBeLessThan(2);
      await input.press("Enter"); await expect(text).toBeVisible();
    }
  }
});

test("native empty lines and existing trailing LF survive editing and reopening exactly", async ({ page }) => {
  await page.locator("#first .smm-node").filter({ hasText: /^时间管理$/ }).dblclick();
  const input = page.locator('#first [contenteditable="true"]');
  await input.fill("保留空行"); await input.press("End");
  await input.press("Shift+Enter"); await input.press("Shift+Enter"); await input.press("Enter");
  const before = await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument());
  expect(before.root.text).toBe("保留空行\n\n");
  await page.evaluate(() => window.mindMapHarness.editors[0]!.execute("edit-text"));
  await input.press("Enter");
  expect(await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).toEqual(before);
  await page.evaluate(async source => {
    const h = window.mindMapHarness; await h.editors[0]!.destroy();
    await h.mount(21, "first", { document: { ...source, root: { ...source.root, text: "  既有空格  \n\n" } } });
    const editor = h.editors.at(-1)!; editor.setZoom(1); await editor.center(); editor.select("n0"); await editor.execute("edit-text");
  }, before);
  await input.press("Enter");
  const spaced = await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument());
  expect(spaced.root.text).toBe("  既有空格  \n\n");
  await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.execute("edit-text")); await input.press("Enter");
  expect(await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument())).toEqual(spaced);
  for (const value of ["", "\n"]) {
    await page.evaluate(async text => {
      const h = window.mindMapHarness, source = await h.editors.at(-1)!.getDocument();
      await h.editors.at(-1)!.destroy(); await h.mount(21, "first", { document: { ...source, root: { ...source.root, text } } });
      const editor = h.editors.at(-1)!; editor.select("n0"); await editor.execute("edit-text");
    }, value);
    await input.press("Enter");
    expect((await page.evaluate(() => window.mindMapHarness.editors.at(-1)!.getDocument())).root.text).toBe(value);
  }
});

test("native plain paste retains literal markup and a final empty line", async ({ page }) => {
  // A temporary native source exercises the browser clipboard; no synthetic
  // DataTransfer readback stands in for the pasted text.
  await page.evaluate(() => { const input = document.createElement("textarea"); input.id = "plain-copy"; document.body.append(input); });
  const source = page.locator("#plain-copy"), value = "<b>纯文本</b>\n第二行\n";
  await source.fill(value); await source.press("ControlOrMeta+a"); await source.press("ControlOrMeta+c");
  await page.locator("#first .smm-node").filter({ hasText: /^时间管理$/ }).dblclick();
  const input = page.locator('#first [contenteditable="true"]'); await input.press("ControlOrMeta+v");
  const native = await input.evaluate(e => Array.from(e.childNodes).map(node => ({ name: node.nodeName, text: node.nodeValue })));
  await input.press("Enter");
  expect((await page.evaluate(() => window.mindMapHarness.editors[0]!.getDocument())).root.text, JSON.stringify(native)).toBe(value);
});

test("a newer edit request supersedes an overlay still waiting for geometry", async ({ page }) => {
  await page.evaluate(async () => {
    const editor = window.mindMapHarness.editors[0]!;
    editor.select("n1"); const previous = editor.execute("edit-text");
    editor.select("n5"); const current = editor.execute("edit-text");
    await Promise.all([previous, current]);
  });
  await expect(page.locator('#first [contenteditable="true"]')).toHaveText("主题 5 · 本周计划");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(async () => (await window.mindMapHarness.editors[0]!.getDocument()).root.children[0]!.children[0]!.text)).toBe("主题 5 · 本周计划");
});

test("readonly or a different selection cancels an edit awaiting geometry", async ({ page }) => {
  await page.evaluate(async () => {
    const editor = window.mindMapHarness.editors[0]!;
    editor.select("n1"); const pending = editor.execute("edit-text"); editor.setReadOnly(true); await pending;
  });
  await expect(page.locator('#first [contenteditable="true"]')).not.toBeVisible();
  await page.evaluate(async () => {
    const editor = window.mindMapHarness.editors[0]!; editor.setReadOnly(false);
    editor.select("n1"); const pending = editor.execute("edit-text"); editor.select("n5"); await pending;
  });
  await expect(page.locator('#first [contenteditable="true"]')).not.toBeVisible();
});
