// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";
import * as core from "@quirekit/data-view";
import Inline from "../inline.vue";

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); });

/** @param rejected - Whether the host rejects complete writes. @param wait - Optional delayed host receipt. @returns Controlled document host. */
async function mount(rejected = false, wait?: Promise<void>) {
  const initial = core.createDataView("workflow");
  if (initial.source.kind !== "inline") throw new Error("Expected inline data");
  const initialValue = core.applyDataViewOperations(initial, [
    {type: "add-field", field: {id: "notes", name: "备注", type: "text"}, defaultValue: null},
    {type: "insert-record", record: {id: "a", values: {title: "设计", status: "todo", notes: "隐藏的长文本"}}},
    {type: "insert-record", record: {id: "b", values: {title: "开发", status: "doing", notes: null}}}
  ], {baseRevision: initial.source.dataset.revision, revision: "ready"});
  const value = shallowRef(core.readDataView({...initialValue, views: initialValue.views.map(view => ({...view, visibleFieldIds: ["title", "status"]}))}));
  const readOnly = shallowRef(false), commits: core.DataViewEmbed[] = [];
  const root = document.body.appendChild(document.createElement("div"));
  const app = createApp({render: () => h(Inline, {value: value.value, readOnly: readOnly.value, commit: async save => {
    if (wait) await wait;
    if (rejected) return {accepted: false, message: "保存被拒绝"};
    value.value = save.value; commits.push(save.value); return {accepted: true};
  }})});
  app.mount(root); cleanup.push(() => { app.unmount(); root.remove(); }); await nextTick();
  return {root, value, readOnly, commits};
}

/** @param root - Surface. @param record - Stable row. @param field - Stable column. @returns Owned cell wrapper. */
function cell(root: HTMLElement, record: string, field: string): HTMLElement {
  return [...root.querySelectorAll<HTMLElement>("[data-dv-table-cell]")].find(element => element.dataset.recordId === record && element.dataset.fieldId === field)!;
}
/** @param element - Native text input. @param value - Complete user text. */
async function input(element: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  element.value = value; element.dispatchEvent(new Event("input", {bubbles: true})); await nextTick();
}
/** @param element - Focus owner. @param key - Native key. @param shiftKey - Reverse navigation. @returns Dispatched cancelable key. */
function key(element: Element, key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {key, shiftKey, bubbles: true, cancelable: true}); element.dispatchEvent(event); return event;
}

it("searches hidden fields in both views and stays usable in read-only mode without document writes", async () => {
  const {root, readOnly, commits} = await mount();
  readOnly.value = true; await nextTick();
  const search = root.querySelector<HTMLInputElement>('input[aria-label="搜索记录"]')!;
  await input(search, "隐藏");
  await expect.poll(() => root.querySelector(".dv-result-count")?.textContent).toBe("1 条记录");
  expect(root.textContent).not.toContain("开发");
  root.querySelector<HTMLButtonElement>('[role="combobox"][aria-label="切换视图"]')!.click();
  let board: HTMLElement | undefined;
  await expect.poll(() => { board = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(option => option.textContent === "看板"); return !!board; }).toBe(true);
  board!.click();
  await expect.poll(() => root.querySelectorAll(".dv-card").length).toBe(1);
  await expect.poll(() => document.activeElement).toBe(root.querySelector('[role="combobox"][aria-label="切换视图"]'));
  expect(search.value).toBe("隐藏");
  await input(search, "");
  await expect.poll(() => root.querySelectorAll(".dv-card").length).toBe(2);
  expect(commits).toHaveLength(0);
});

it("commits Tab once, navigates by stable row and field, and preserves composition and Escape", async () => {
  const {root, value, commits} = await mount();
  cell(root, "a", "title").querySelector("button")!.click(); await nextTick();
  const editor = cell(root, "a", "title").querySelector("input")!;
  await input(editor, "中文任务");
  editor.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", isComposing: true, bubbles: true}));
  expect(commits).toHaveLength(0);
  key(editor, "Tab");
  await expect.poll(() => cell(root, "a", "status").contains(document.activeElement)).toBe(true);
  expect(commits).toHaveLength(1);
  expect(value.value.source.kind === "inline" && value.value.source.dataset.records[0]!.values.title).toBe("中文任务");
  key(document.activeElement!, "ArrowDown");
  await expect.poll(() => cell(root, "b", "status").contains(document.activeElement)).toBe(true);
  key(document.activeElement!, "Tab", true);
  await expect.poll(() => cell(root, "b", "title").contains(document.activeElement)).toBe(true);
  (document.activeElement as HTMLElement).click(); await nextTick();
  const cancelled = cell(root, "b", "title").querySelector("input")!;
  await input(cancelled, "不保存"); key(cancelled, "Escape"); await nextTick();
  expect(commits).toHaveLength(1);
  expect(cell(root, "b", "title").textContent).toBe("开发");
});

it("keeps focus in the original cell after a rejected navigation commit", async () => {
  const {root} = await mount(true);
  cell(root, "a", "title").querySelector("button")!.click(); await nextTick();
  const editor = cell(root, "a", "title").querySelector("input")!;
  await input(editor, "新标题"); key(editor, "Tab");
  await expect.poll(() => root.querySelector('[role="alert"]')?.textContent).toBe("保存被拒绝");
  await expect.poll(() => cell(root, "a", "title").contains(document.activeElement)).toBe(true);
});

it("persists bounded keyboard column widths and suppresses resize in read-only mode", async () => {
  const {root, value, readOnly, commits} = await mount();
  const handle = root.querySelector<HTMLElement>('[role="separator"][aria-label="调整名称列宽"]')!;
  handle.focus(); key(handle, "ArrowRight");
  await expect.poll(() => value.value.views[0]).toMatchObject({columnWidths: {title: 290}});
  key(handle, "Home");
  await expect.poll(() => value.value.views[0]).toMatchObject({columnWidths: {title: 80}});
  expect(commits).toHaveLength(2);
  readOnly.value = true; await nextTick();
  expect(root.querySelector('[role="separator"]')).toBeNull();
});

it("previews pointer widths without querying or committing, then commits the final point once", async () => {
  const query = vi.spyOn(core, "queryDataTable");
  const {root, value, commits} = await mount();
  const handle = root.querySelector<HTMLElement>('[role="separator"][aria-label="调整名称列宽"]')!;
  handle.setPointerCapture = vi.fn(); handle.releasePointerCapture = vi.fn(); handle.hasPointerCapture = () => true;
  const calls = query.mock.calls.length;
  expect(calls).toBe(1);
  handle.dispatchEvent(new PointerEvent("pointerdown", {pointerId: 1, clientX: 100, button: 0, bubbles: true}));
  handle.dispatchEvent(new PointerEvent("pointermove", {pointerId: 1, clientX: 140, bubbles: true}));
  await expect.poll(() => handle.getAttribute("aria-valuenow")).toBe("320");
  expect(commits).toHaveLength(0); expect(query).toHaveBeenCalledTimes(calls);
  handle.dispatchEvent(new PointerEvent("pointerup", {pointerId: 1, clientX: 160, bubbles: true}));
  await expect.poll(() => value.value.views[0]).toMatchObject({columnWidths: {title: 340}});
  expect(commits).toHaveLength(1);
});

it("edits hidden long text in record details and retains a readable view after permission changes", async () => {
  const {root, value, readOnly} = await mount();
  root.querySelector<HTMLButtonElement>('[aria-label="查看记录：设计"]')!.click();
  let drawer: HTMLElement;
  await expect.poll(() => { drawer = document.querySelector<HTMLElement>(".dv-record-details")!; return drawer?.textContent; }).toContain("备注");
  const notes = [...drawer!.querySelectorAll<HTMLButtonElement>("button")].find(button => button.getAttribute("aria-label") === "编辑备注：隐藏的长文本")!;
  notes.click(); await nextTick();
  const editor = drawer!.querySelector("textarea")!;
  await input(editor, "第一行\n第二行"); editor.dispatchEvent(new Event("blur"));
  await expect.poll(() => value.value.source.kind === "inline" && value.value.source.dataset.records[0]!.values.notes).toBe("第一行\n第二行");
  readOnly.value = true; await nextTick();
  expect(drawer!.textContent).toContain("第一行\n第二行");
  expect(drawer!.querySelector('[aria-label^="编辑备注"]')).toBeNull();
});

it("waits for the actual receipt even if rejected source text happens to match the candidate", async () => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const {root, value} = await mount(true, wait);
  cell(root, "a", "title").querySelector("button")!.click(); await nextTick();
  const editor = cell(root, "a", "title").querySelector("input")!;
  await input(editor, "外部相同标题"); key(editor, "Tab"); await nextTick();
  expect(cell(root, "a", "status").contains(document.activeElement)).toBe(false);
  if (value.value.source.kind !== "inline") throw new Error("Expected inline data");
  value.value = core.applyDataViewOperations(value.value, [{type: "set-cell", recordId: "a", fieldId: "title", value: "外部相同标题"}], {baseRevision: value.value.source.dataset.revision, revision: "external"});
  await nextTick(); release();
  await expect.poll(() => root.querySelector('[role="alert"]')?.textContent).toBe("保存被拒绝");
  await expect.poll(() => cell(root, "a", "title").contains(document.activeElement)).toBe(true);
});

it("moves Enter vertically, preserves reverse navigation and lets boundary Tab leave the cells", async () => {
  const query = vi.spyOn(core, "queryDataTable");
  const {root} = await mount();
  cell(root, "a", "title").querySelector("button")!.click(); await nextTick();
  key(cell(root, "a", "title").querySelector("input")!, "Enter");
  await expect.poll(() => cell(root, "b", "title").contains(document.activeElement)).toBe(true);
  (document.activeElement as HTMLElement).click(); await nextTick();
  key(cell(root, "b", "title").querySelector("input")!, "Enter", true);
  await expect.poll(() => cell(root, "a", "title").contains(document.activeElement)).toBe(true);
  expect(key(document.activeElement!, "Tab", true).defaultPrevented).toBe(false);
  cell(root, "b", "status").querySelector<HTMLElement>("button")!.focus();
  expect(key(document.activeElement!, "Tab").defaultPrevented).toBe(false);
  expect(query).toHaveBeenCalledTimes(1);
});

it("cancels column gestures on Escape, permission changes and source replacement, and honors RTL", async () => {
  const {root, value, readOnly, commits} = await mount();
  let handle = root.querySelector<HTMLElement>('[role="separator"][aria-label="调整名称列宽"]')!;
  /** @param target - Owned separator. */
  function capture(target: HTMLElement): void {
    target.setPointerCapture = vi.fn(); target.releasePointerCapture = vi.fn(); target.hasPointerCapture = () => true;
    target.dispatchEvent(new PointerEvent("pointerdown", {pointerId: 1, clientX: 100, button: 0, bubbles: true}));
    target.dispatchEvent(new PointerEvent("pointermove", {pointerId: 1, clientX: 150, bubbles: true}));
  }
  capture(handle);
  await expect.poll(() => handle.getAttribute("aria-valuenow")).toBe("330");
  key(handle, "Escape"); await nextTick();
  expect(handle.getAttribute("aria-valuenow")).toBe("280");
  capture(handle); readOnly.value = true; await nextTick();
  handle.dispatchEvent(new PointerEvent("pointerup", {pointerId: 1, clientX: 180, bubbles: true}));
  expect(commits).toHaveLength(0);
  readOnly.value = false; await nextTick();
  handle = root.querySelector<HTMLElement>('[role="separator"][aria-label="调整名称列宽"]')!;
  capture(handle);
  if (value.value.source.kind !== "inline") throw new Error("Expected inline data");
  value.value = {...value.value, source: {kind: "inline", dataset: {...value.value.source.dataset, revision: "external"}}};
  await nextTick(); handle.dispatchEvent(new PointerEvent("pointerup", {pointerId: 1, clientX: 180, bubbles: true}));
  expect(commits).toHaveLength(0);
  handle.style.direction = "rtl"; handle.parentElement!.style.direction = "rtl";
  key(handle, "ArrowLeft");
  await expect.poll(() => value.value.views[0]).toMatchObject({columnWidths: {title: 290}});
});

it("returns details focus to its entry and closes when its record is deleted", async () => {
  const {root, value} = await mount();
  const trigger = root.querySelector<HTMLButtonElement>('[aria-label="查看记录：设计"]')!;
  trigger.focus(); trigger.click();
  await expect.poll(() => document.querySelector(".dv-record-details")).not.toBeNull();
  const drawer = document.querySelector(".dv-record-details")!.closest('[role="dialog"]')!;
  await expect.poll(() => drawer.contains(document.activeElement)).toBe(true);
  drawer.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click();
  await expect.poll(() => document.querySelector(".dv-record-details")).toBeNull();
  await expect.poll(() => document.activeElement).toBe(trigger);
  trigger.click();
  await expect.poll(() => document.querySelector(".dv-record-details")?.closest('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
  if (value.value.source.kind !== "inline") throw new Error("Expected inline data");
  value.value = core.applyDataViewOperations(value.value, [{type: "delete-record", recordId: "a"}], {baseRevision: value.value.source.dataset.revision, revision: "removed"});
  await expect.poll(() => document.querySelector(".dv-record-details")).toBeNull();
  await expect.poll(() => root.contains(document.activeElement)).toBe(true);
});

it("keeps the captured neighboring record when an accepted edit changes sort order", async () => {
  const {root, value} = await mount();
  if (value.value.source.kind !== "inline") throw new Error("Expected inline data");
  const renamed = core.applyDataViewOperations(value.value, [
    {type: "set-cell", recordId: "a", fieldId: "title", value: "A"}, {type: "set-cell", recordId: "b", fieldId: "title", value: "B"}
  ], {baseRevision: value.value.source.dataset.revision, revision: "renamed"});
  value.value = core.readDataView({...renamed, views: renamed.views.map(view => view.type === "table" ? {...view, query: {sort: [{fieldId: "title", direction: "asc", nulls: "last"}]}} : view)});
  await nextTick(); cell(root, "a", "title").querySelector("button")!.click(); await nextTick();
  const editor = cell(root, "a", "title").querySelector("input")!;
  await input(editor, "Z"); key(editor, "Enter");
  await expect.poll(() => cell(root, "b", "title").contains(document.activeElement)).toBe(true);
  expect(root.querySelector<HTMLElement>("[data-dv-table-cell]")?.dataset.recordId).toBe("b");
});

it("closes details and clears transient search when the dataset identity changes", async () => {
  const {root, value, commits} = await mount();
  const search = root.querySelector<HTMLInputElement>('input[aria-label="搜索记录"]')!;
  await input(search, "隐藏");
  const trigger = root.querySelector<HTMLButtonElement>('[aria-label="查看记录：设计"]')!;
  trigger.focus(); trigger.click();
  await expect.poll(() => document.querySelector(".dv-record-details")?.closest('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
  if (value.value.source.kind !== "inline") throw new Error("Expected inline data");
  value.value = core.readDataView({...value.value, source: {kind: "inline", dataset: {...value.value.source.dataset, id: "replacement"}}});
  await expect.poll(() => document.querySelector(".dv-record-details")).toBeNull();
  expect(search.value).toBe(""); expect(commits).toHaveLength(0);
});

it("closes a details Select before its enclosing drawer when Escape is pressed", async () => {
  const {root} = await mount();
  root.querySelector<HTMLButtonElement>('[aria-label="查看记录：设计"]')!.click();
  let details: HTMLElement;
  await expect.poll(() => { details = document.querySelector<HTMLElement>(".dv-record-details")!; return !!details; }).toBe(true);
  await expect.poll(() => details!.closest('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
  const status = details!.querySelector<HTMLButtonElement>('[aria-label="编辑状态：待办"]')!;
  status.click();
  let listbox: HTMLElement;
  await expect.poll(() => {
    listbox = [...document.querySelectorAll<HTMLElement>('[role="listbox"]')].find(element => !element.hidden)!;
    return !!listbox && (listbox.contains(document.activeElement) || details!.querySelector('[role="combobox"]') === document.activeElement);
  }).toBe(true);
  key(document.activeElement!, "Escape");
  await expect.poll(() => !listbox!.isConnected || listbox!.hidden).toBe(true);
  expect(document.querySelector(".dv-record-details")).not.toBeNull();
  await expect.poll(() => details!.querySelector('[aria-label="编辑状态：待办"]') === document.activeElement).toBe(true);
});
