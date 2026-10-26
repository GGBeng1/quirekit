// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { EditorSelection, StateEffect } from "@quirekit/cm-state";
import { Link } from "@quirekit/msfe-link";
import MdEditor from "../editor.vue";
import type { MdEditorInstance, MdEditorProps } from "../types";

let cleanup = (): void => {};
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.replaceChildren(); });

/** @param markdown - Canonical fixture. @param options - Product configuration. @returns Product editor and rendered-link activation. */
async function mount(markdown: string, options: Partial<MdEditorProps> = {}) {
  Object.defineProperty(document, "fonts", { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve(), load: () => Promise.resolve([]) }) });
  const host = document.body.appendChild(document.createElement("div")), product = shallowRef<MdEditorInstance>();
  const app = createApp({ render: () => h(MdEditor, { ref: product, markdown, ...options }) });
  cleanup = () => app.unmount(); app.mount(host); await nextTick();
  await vi.waitFor(() => expect(product.value?.editor).toBeTruthy());
  const editor = product.value!.editor!;
  /** @param label - Visible link label. @param modifiers - Native click options. */
  async function click(label: string, modifiers: MouseEventInit = {}): Promise<void> {
    let link: HTMLAnchorElement | undefined;
    // Reference projection may finish in the parser's scheduled viewport pass.
    await vi.waitFor(() => {
      link = [...editor.element.querySelectorAll<HTMLAnchorElement>("a[data-msfe-url]")].find(item => item.textContent === label);
      expect(link).toBeTruthy();
    });
    link!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, ...modifiers })); await nextTick();
  }
  return { editor, click };
}

/** @param label - Accessible context action. @returns Visible action button. */
function action(label: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`[data-md-link-context] button[aria-label="${label}"]`)!;
}

it("opens the clicked link's card, then hands it to persistent settings without writing source", async () => {
  const markdown = "[guide](/guide) and [other](/other)", { editor, click } = await mount(markdown);
  await click("guide");
  await vi.waitFor(() => expect(action("编辑链接")).toBeTruthy());
  expect(document.querySelector("[data-md-link-context]")?.textContent).toContain("/guide");
  action("编辑链接").click(); await nextTick();
  await vi.waitFor(() => expect(document.querySelector<HTMLInputElement>("[data-md-destination]")?.value).toBe("/guide"));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
  expect(document.querySelector("[data-md-destination]")).not.toBeNull();
  expect(editor.getMarkdown()).toBe(markdown); expect(editor.history.canUndo).toBe(false);
});

it("removes only the clicked formatted reference and undoes in one step", async () => {
  const markdown = '[**first**][shared] and [second][shared]\n\n[shared]: /guide "title"';
  const { editor, click } = await mount(markdown);
  await click("first"); await vi.waitFor(() => expect(action("移除链接")).toBeTruthy());
  action("移除链接").click(); await nextTick();
  expect(editor.getMarkdown()).toBe('**first** and [second][shared]\n\n[shared]: /guide "title"');
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
  editor.undo(); expect(editor.getMarkdown()).toBe(markdown); expect(editor.history.canUndo).toBe(false);
});

it("closes on source changes and selection changes, doing no snapshot work while idle", async () => {
  const { editor, click } = await mount("[guide](/guide) tail", { toolbar: false, selectionToolbar: false, blockControls: false });
  const read = vi.spyOn(editor, "getMarkdown"), query = vi.spyOn(editor, "querySource"), anchor = vi.spyOn(editor, "captureAnchor");
  for (let i = 0; i < 10; i++) editor.setSelection(EditorSelection.single(i)); await nextTick();
  expect(read).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled(); expect(anchor).not.toHaveBeenCalled();
  editor.setSelection(EditorSelection.single(2));
  await click("guide"); await vi.waitFor(() => expect(action("编辑链接")).toBeTruthy());
  editor.setSelection(EditorSelection.single(editor.state.doc.length)); await nextTick();
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
  await click("guide"); await vi.waitFor(() => expect(action("编辑链接")).toBeTruthy());
  editor.run(() => ({ changes: { from: 2, insert: "new" } })); await nextTick();
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
});

it("uses the host opener for both context navigation and modified clicks", async () => {
  const openLink = vi.fn(), { editor, click } = await mount("[guide](/guide)", { features: { link: Link.configure({ openLink }) } });
  await click("guide"); await vi.waitFor(() => expect(action("打开链接")).toBeTruthy());
  expect(openLink).not.toHaveBeenCalled();
  action("打开链接").click(); await nextTick();
  expect(openLink).toHaveBeenCalledExactlyOnceWith("/guide");
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
  await click("guide", { ctrlKey: true });
  expect(openLink).toHaveBeenCalledTimes(2);
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
  editor.setMode("locked"); await nextTick(); await click("guide");
  expect(openLink).toHaveBeenCalledTimes(3);
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
});

it("shows copy success and failure without editing source", async () => {
  const markdown = "[guide](/guide)", { editor, click } = await mount(markdown);
  const write = vi.spyOn(window.navigator.clipboard, "writeText").mockResolvedValue(undefined);
  await click("guide"); await vi.waitFor(() => expect(action("复制链接")).toBeTruthy());
  action("复制链接").click(); await nextTick();
  expect(write).toHaveBeenCalledExactlyOnceWith("/guide");
  await vi.waitFor(() => expect(document.querySelector("[data-md-link-context]")?.textContent).toContain("链接已复制"));
  write.mockRejectedValue(new Error("Denied"));
  action("复制链接").click(); await nextTick(); await nextTick();
  await vi.waitFor(() => expect(document.querySelector("[data-md-link-context]")?.textContent).toContain("链接复制失败"));
  expect(editor.getMarkdown()).toBe(markdown); expect(editor.history.canUndo).toBe(false);
});

it.each(["<https://example.com>", "https://example.com"])("removes the complete autolink %s without leaving link syntax", async markdown => {
  const { editor, click } = await mount(`${markdown} tail`);
  await click("https://example.com"); await vi.waitFor(() => expect(action("移除链接")).toBeTruthy());
  action("移除链接").click(); await nextTick();
  expect(editor.element.querySelector("a[data-msfe-url]")).toBeNull();
  expect(editor.getMarkdown()).not.toContain("<"); expect(editor.getMarkdown()).not.toContain(">");
  editor.undo(); expect(editor.getMarkdown()).toBe(`${markdown} tail`); expect(editor.history.canUndo).toBe(false);
});

it("keeps read-only links navigable and copyable, then refreshes edit permissions on reopening", async () => {
  const { editor, click } = await mount("[guide](/guide)", { readOnly: true });
  await click("guide"); await vi.waitFor(() => expect(action("复制链接")).toBeTruthy());
  expect(action("编辑链接").getAttribute("aria-disabled")).toBe("true"); expect(action("移除链接").getAttribute("aria-disabled")).toBe("true");
  expect(action("打开链接").getAttribute("aria-disabled")).toBeNull(); expect(action("复制链接").getAttribute("aria-disabled")).toBeNull();
  action("移除链接").click(); await nextTick(); expect(editor.getMarkdown()).toBe("[guide](/guide)");
  editor.setReadOnly(false); await nextTick();
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
  await click("guide"); await vi.waitFor(() => expect(action("编辑链接")).toBeTruthy());
  expect(action("编辑链接").getAttribute("aria-disabled")).toBeNull();
  editor.replaceDocument("[replacement](/other)", "new"); await nextTick();
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
});

it("does not interrupt range selection, double clicks, or source mode", async () => {
  const { editor, click } = await mount("[guide](/guide) tail");
  await click("guide", { detail: 2 }); expect(document.querySelector("[data-md-link-context]")).toBeNull();
  editor.setSelection(EditorSelection.single(1, 6)); await nextTick();
  await click("guide"); expect(document.querySelector("[data-md-link-context]")).toBeNull();
  editor.setSelection(EditorSelection.single(1)); editor.setMode("source"); await nextTick();
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
});

it("unmounts the context card on Escape and scrolling", async () => {
  const { click } = await mount("[guide](/guide)");
  await click("guide"); await vi.waitFor(() => expect(action("编辑链接")).toBeTruthy());
  action("编辑链接").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(document.querySelector("[data-md-link-context]")).toBeNull());
  await click("guide"); await vi.waitFor(() => expect(action("编辑链接")).toBeTruthy());
  window.dispatchEvent(new Event("scroll")); await nextTick();
  expect(document.querySelector("[data-md-link-context]")).toBeNull();
});

it("keeps the card through presentation-only updates without re-reading or measuring its link", async () => {
  const { editor, click } = await mount("[guide](/guide)", { toolbar: false, selectionToolbar: false, blockControls: false });
  await click("guide"); await vi.waitFor(() => expect(action("编辑链接")).toBeTruthy());
  const capture = vi.spyOn(editor, "captureAnchor"), read = vi.spyOn(editor, "getMarkdown"), query = vi.spyOn(editor, "querySource");
  const geometry = vi.spyOn(Element.prototype, "getBoundingClientRect"), effect = StateEffect.define<number>();
  for (let i = 0; i < 10; i++) editor.updateViewState({ effects: [effect.of(i)] });
  expect(geometry).not.toHaveBeenCalled(); await nextTick();
  expect(action("编辑链接")).toBeTruthy();
  expect(read).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled(); expect(capture).not.toHaveBeenCalled();
});
