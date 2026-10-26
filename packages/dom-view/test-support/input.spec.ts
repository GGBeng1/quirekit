import { expect, test } from "@playwright/test";
import "./types";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#editor .ProseMirror")).toBeVisible();
});

test("native keyboard input, paragraph/soft breaks, format commands and history", async ({ page }) => {
  const input = page.getByRole("textbox");
  await input.click();
  await input.pressSequentially("Hello");
  await input.press("Enter");
  await input.pressSequentially("world");
  await input.press("Shift+Enter");
  await input.pressSequentially("next");
  await expect(input.locator("p")).toHaveCount(2);
  await expect(input.locator("br")).toHaveCount(1);
  const state = await page.evaluate(() => {
    const { editor, view, EditorView } = window.domFixture;
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.toggleBold();
    return { native: view.nativeView instanceof EditorView, same: view.state === editor.state.pm, html: editor.getHTML() };
  });
  expect(state.native && state.same).toBe(true);
  expect(state.html).toContain("<strong>Hello</strong>");
  await page.evaluate(() => window.domFixture.editor.commands.undo());
  await expect(input.locator("strong")).toHaveCount(0);
  await page.evaluate(() => window.domFixture.editor.commands.redo());
  await expect(input.locator("strong")).toHaveText("Hello");
  expect(await page.evaluate(() => window.domFixture.editor.getText())).toContain("world");
});

test("HTML/text clipboard transforms execute once and native coordinates round trip", async ({ page }) => {
  const result = await page.evaluate(() => {
    const f = window.domFixture;
    const calls: string[] = [];
    const Transform = f.Extension.create({
      name: "paste-transform",
      transformPastedHTML(html) { calls.push("extension"); return html.replace("alpha", "beta"); }
    });
    f.create({
      extensions: [f.StarterKit, f.DomViewExtension, Transform],
      editorProps: {
        transformPastedHTML: (html: string) => { calls.push("direct"); return html.replace("before", "alpha"); }
      }
    });
    f.view.focus();
    f.view.pasteHTML("<p><strong>before</strong></p>");
    const html = f.editor.getHTML();
    f.view.pasteText(" plain");
    const pos = f.view.domAtPos(2);
    const rect = f.view.coordsAtPos(2);
    const hit = f.view.posAtCoords({ left: rect.left, top: (rect.top + rect.bottom) / 2 });
    return { calls, html, text: f.editor.getText(), pos: f.view.posAtDOM(pos.node, pos.offset), hit: hit?.pos, height: rect.bottom - rect.top };
  });
  expect(result.calls).toEqual(["direct", "extension"]);
  expect(result.html).toContain("<strong>beta</strong>");
  expect(result.text).toBe("beta plain");
  expect(result.pos).toBe(2);
  expect(result.hit).toBe(2);
  expect(result.height).toBeGreaterThan(0);
});

test("read-only, dynamic props, focus events and unmount/remount preserve state and history", async ({ page }) => {
  const result = await page.evaluate(() => {
    const f = window.domFixture;
    const events: string[] = [];
    f.create({ onFocus: () => events.push("focus"), onBlur: () => events.push("blur") });
    f.view.focus();
    f.editor.commands.insertContent("kept");
    f.editor.setEditable(false);
    const readonly = f.view.dom.contentEditable;
    const pasted = f.view.pasteText("blocked");
    f.editor.setEditorProps({ attributes: { "aria-label": "评论内容" } });
    const label = f.view.dom.getAttribute("aria-label");
    const old = f.view;
    f.editor.unmount();
    const removed = !old.dom.isConnected && old.isDestroyed;
    f.editor.setEditable(true);
    f.editor.mount({ mode: "dom", element: document.querySelector<HTMLElement>("#editor")! });
    const remounted = f.editor.getText();
    f.editor.commands.undo();
    return { readonly, pasted, label, removed, remounted, undone: f.editor.getText(), events };
  });
  expect(result).toMatchObject({ readonly: "false", pasted: false, label: "评论内容", removed: true, remounted: "kept", undone: "" });
  expect(result.events).toContain("focus");
  await page.getByRole("textbox").click();
  await page.locator("#submit").click();
  expect(await page.evaluate(() => window.domFixture.editor.isFocused)).toBe(false);
});

test("composition preedit is browser-owned and commits Chinese text once", async ({ page }) => {
  const input = page.getByRole("textbox");
  await input.click();
  await input.dispatchEvent("compositionstart", { data: "" });
  expect(await page.evaluate(() => window.domFixture.view.composing)).toBe(true);
  await page.evaluate(() => {
    const paragraph = window.domFixture.view.dom.querySelector("p")!;
    paragraph.textContent = "中";
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(paragraph.firstChild!, 1, paragraph.firstChild!, 1);
  });
  await input.dispatchEvent("compositionupdate", { data: "中" });
  await expect(input).toHaveText("中");
  await page.evaluate(() => {
    const text = window.domFixture.view.dom.querySelector("p")!.firstChild!;
    text.textContent = "中文";
    window.getSelection()!.setBaseAndExtent(text, 2, text, 2);
  });
  await input.dispatchEvent("compositionupdate", { data: "中文" });
  await expect(input).toHaveText("中文");
  await input.dispatchEvent("compositionend", { data: "中文" });
  await expect.poll(() => page.evaluate(() => window.domFixture.editor.getText())).toBe("中文");
  expect(await page.evaluate(() => window.domFixture.view.composing)).toBe(false);
  await page.evaluate(() => window.domFixture.editor.commands.undo());
  await expect(input).toHaveText("");
});

test("filtered native DOM input is restored to the accepted Core document", async ({ page }) => {
  await page.evaluate(() => {
    const f = window.domFixture;
    const Filter = f.Extension.create({
      name: "input-filter",
      addProseMirrorPlugins() {
        return [new f.Plugin({ filterTransaction: tr => !tr.doc.textContent.includes("x") })];
      }
    });
    f.create({ extensions: [f.StarterKit, f.DomViewExtension, Filter] });
  });
  const input = page.getByRole("textbox");
  await input.click();
  await input.pressSequentially("axb", { delay: 30 });
  await expect(input).toHaveText("ab");
  expect(await page.evaluate(() => window.domFixture.editor.getText())).toBe("ab");
});
