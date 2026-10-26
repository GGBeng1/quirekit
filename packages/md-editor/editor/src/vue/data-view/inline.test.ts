// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyDataViewOperations, createDataView, dataViewMarkdown, type DataViewEmbed } from "@quirekit/data-view";
import MdEditor from "../editor.vue";
import type { MdEditorInstance } from "../types";

const cleanup: (() => void)[] = [];
beforeEach(() => {
  Object.defineProperty(document, "fonts", {configurable: true, value: Object.assign(new EventTarget(), {ready: Promise.resolve(), load: () => Promise.resolve([])})});
});
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); vi.useRealTimers(); });
/** Settles the product's scheduled Vue and component-view updates. */
async function settle(): Promise<void> { await nextTick(); await vi.advanceTimersByTimeAsync(50); await nextTick(); }
/** @returns A real product with a portable editable record. */
async function mount() {
  vi.useFakeTimers();
  const initial = applyDataViewOperations(createDataView("inline-product"), [{type: "insert-record", record: {id: "one", values: {title: "接入编辑器", status: "todo"}}}], {baseRevision: "inline-product:initial", revision: "1"});
  const source = `开头\n\n${dataViewMarkdown(initial)}\n\n结尾`;
  const element = document.body.appendChild(document.createElement("div")), product = shallowRef<MdEditorInstance>(), errors: unknown[] = [];
  const app = createApp({render: () => h(MdEditor, {markdown: source, ref: product, onError: (error: unknown) => errors.push(error)})});
  cleanup.push(() => { app.unmount(); element.remove(); }); app.mount(element); await settle();
  expect(errors).toEqual([]);
  const editor = product.value!.editor!;
  /** @returns The current canonical embed, read through the public source query. */
  function value(): DataViewEmbed { return editor.querySource("dataView").matches[0]!.attrs.dataView as DataViewEmbed; }
  return {element, editor, source, value};
}
/** @param root - Inline data view. @returns Its view switcher. */
function viewSelect(root: HTMLElement): HTMLElement {
  return root.querySelector<HTMLElement>('[role="combobox"][aria-label="切换视图"]')!;
}

/**
 * Switches views through the dropdown, as a person does.
 * @param root - Inline data view.
 * @param name - Visible view name.
 */
async function chooseView(root: HTMLElement, name: string): Promise<void> {
  press(viewSelect(root)); await settle();
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(item => item.textContent === name);
  if (option !== undefined) press(option);
  await settle();
}

/** Dispatches a pointer gesture so the product's object-selection capture runs.
 * @param element - Visible native control.
 */
function press(element: HTMLElement): void {
  element.dispatchEvent(new PointerEvent("pointerdown", {bubbles: true, cancelable: true, button: 0}));
  element.dispatchEvent(new MouseEvent("mousedown", {bubbles: true, cancelable: true, button: 0}));
  element.click();
}
/** @param root - Surface. @param label - Accessible cell name. @returns Its native button. */
function cell(root: Element, label: string): HTMLButtonElement { return [...root.querySelectorAll("button")].find(button => button.getAttribute("aria-label") === label)!; }

it("edits cells in the document, leaving input keys local and preserving document undo", async () => {
  const f = await mount(), root = f.element.querySelector<HTMLElement>('[data-qk-data-view="inline"]')!;
  press(root); await settle();
  expect(f.editor.element.hasAttribute("data-md-object-selected")).toBe(true);
  press(cell(root, "编辑名称：接入编辑器")); await settle();
  expect(f.editor.element.hasAttribute("data-md-object-selected")).toBe(false);
  const input = root.querySelector<HTMLInputElement>('input[aria-label="名称"]')!;
  expect(document.activeElement).toBe(input);
  input.dispatchEvent(new KeyboardEvent("keydown", {key: "Backspace", bubbles: true, cancelable: true}));
  expect(f.editor.getMarkdown()).toBe(f.source);
  input.value = "直接编辑中文"; input.dispatchEvent(new Event("input", {bubbles: true})); await nextTick();
  input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true, cancelable: true})); await settle();
  expect(f.editor.getMarkdown()).toContain("直接编辑中文");
  expect(f.element.querySelector('[role="dialog"]')).toBeNull();
  expect(cell(root, "编辑名称：直接编辑中文")).toBeDefined();
  expect(document.activeElement).toBe(cell(root, "编辑名称：直接编辑中文"));
  f.editor.undo(); await settle(); expect(f.editor.getMarkdown()).toBe(f.source);
  expect(cell(root, "编辑名称：接入编辑器")).toBeDefined();
  f.editor.redo(); await settle(); expect(f.editor.getMarkdown()).toContain("直接编辑中文");
});

it("persists board navigation and dropdown changes, and follows read-only state", async () => {
  const f = await mount(), root = f.element.querySelector<HTMLElement>('[data-qk-data-view="inline"]')!;
  press(cell(root, "编辑状态：待办")); await settle();
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(item => item.textContent === "进行中")!;
  press(option); await settle();
  expect(f.editor.getMarkdown()).toContain('"status":"doing"');
  await chooseView(root, "看板");
  expect(f.value().defaultViewId).toBe("board");
  expect(root.querySelector(".dv-card")?.textContent).toContain("接入编辑器");
  f.editor.undo(); await settle(); expect(f.value().defaultViewId).toBe("table");
  expect(viewSelect(root).textContent).toContain("表格");
  f.editor.setReadOnly(true); await settle();
  expect(cell(root, "编辑名称：接入编辑器")).toBeUndefined();
  const locked = f.editor.getMarkdown();
  await chooseView(root, "看板");
  expect(f.editor.getMarkdown()).toBe(locked);
});

it("cancels an unfinished cell when its source value or permission changes", async () => {
  const f = await mount(), root = f.element.querySelector<HTMLElement>('[data-qk-data-view="inline"]')!;
  press(cell(root, "编辑名称：接入编辑器")); await settle();
  f.editor.setReadOnly(true); await settle();
  expect(root.querySelector('input[aria-label="名称"]')).toBeNull();
  expect(f.editor.getMarkdown()).toBe(f.source);
});
