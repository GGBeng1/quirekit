// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import type { DataField, DataValue } from "@quirekit/data-view";
import Cell from "./surface.vue";

const mounted: {app: App; root: HTMLElement}[] = [];
afterEach(() => { for (const {app, root} of mounted.splice(0)) { app.unmount(); root.remove(); } });
/** @param field - Cell schema. @param value - Exact canonical value. @param multiline - Details editing mode. @returns Mounted public cell and emitted changes. */
function mount(field: DataField, value: DataValue, multiline = false) {
  const root = document.createElement("div"), changes: DataValue[] = [];
  document.body.append(root);
  const app = createApp({render: () => h(Cell, {field, value, primary: field.id === "title", multiline, readOnly: false, onChange: (next: DataValue) => changes.push(next)})});
  app.mount(root); mounted.push({app, root}); return {root, changes};
}
it("does not Boolean-cast an empty text value", () => {
  const {root} = mount({id: "title", name: "名称", type: "text"}, "");
  expect(root.querySelector("button")?.getAttribute("aria-label")).toBe("编辑名称：");
  expect(root.textContent).toBe("空白");
});
it("keeps composition Enter local and commits complete Chinese text once", async () => {
  const {root, changes} = mount({id: "title", name: "名称", type: "text"}, "");
  root.querySelector("button")!.click(); await nextTick();
  const input = root.querySelector("input")!; input.value = "中文任务"; input.dispatchEvent(new Event("input", {bubbles: true})); await nextTick();
  input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", isComposing: true, bubbles: true}));
  expect(changes).toEqual([]);
  input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true})); await nextTick();
  expect(changes).toEqual(["中文任务"]);
});
it("commits Select value even when the component closes before publishing it", async () => {
  const {root, changes} = mount({id: "status", name: "状态", type: "singleSelect", options: [{id: "doing", label: "进行中"}]}, null);
  root.querySelector("button")!.click(); await nextTick();
  let option: HTMLElement | undefined;
  await expect.poll(() => {
    option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(item => item.textContent === "进行中");
    return option !== undefined;
  }).toBe(true);
  option!.click();
  await expect.poll(() => changes).toEqual(["doing"]);
});

it("keeps multi-choice edits local until completion and cancels without changing the source", async () => {
  const {root, changes} = mount({id: "tags", name: "标签", type: "multiSelect", options: [{id: "a", label: "甲"}, {id: "b", label: "乙"}]}, ["a"]);
  root.querySelector("button")!.click(); await nextTick();
  root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]!.click(); await nextTick();
  expect(changes).toEqual([]);
  root.querySelector(".dv-multi")!.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true})); await nextTick();
  expect(changes).toEqual([]);
  root.querySelector("button")!.click(); await nextTick();
  [...root.querySelectorAll("button")].find(button => button.textContent === "完成")!.click(); await nextTick();
  expect(changes).toEqual([]);
  root.querySelector("button")!.click(); await nextTick();
  root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]!.click(); await nextTick();
  [...root.querySelectorAll("button")].find(button => button.textContent === "完成")!.click(); await nextTick();
  expect(changes).toEqual([["a", "b"]]);
});

it("keeps Enter native in long notes while title and numeric details retain normal submission", async () => {
  const notes = mount({id: "notes", name: "备注", type: "text"}, "第一行", true);
  notes.root.querySelector("button")!.click(); await nextTick();
  const textarea = notes.root.querySelector("textarea")!;
  textarea.value = "第一行\n第二行"; textarea.dispatchEvent(new Event("input", {bubbles: true})); await nextTick();
  const enter = new KeyboardEvent("keydown", {key: "Enter", bubbles: true, cancelable: true}); textarea.dispatchEvent(enter);
  expect(enter.defaultPrevented).toBe(false); expect(notes.changes).toEqual([]);
  textarea.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", ctrlKey: true, bubbles: true}));
  expect(notes.changes).toEqual(["第一行\n第二行"]);
  const title = mount({id: "title", name: "名称", type: "text"}, "旧标题", true);
  title.root.querySelector("button")!.click(); await nextTick();
  expect(title.root.querySelector("textarea")).toBeNull();
  const input = title.root.querySelector("input")!;
  input.value = "新标题"; input.dispatchEvent(new Event("input", {bubbles: true})); await nextTick();
  input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
  expect(title.changes).toEqual(["新标题"]);
  const numeric = mount({id: "effort", name: "工作量", type: "number"}, 1, true);
  numeric.root.querySelector("button")!.click(); await nextTick();
  const number = numeric.root.querySelector("input")!;
  number.value = "2"; number.dispatchEvent(new Event("input", {bubbles: true})); await nextTick();
  number.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}));
  expect(numeric.changes).toEqual([2]);
});
