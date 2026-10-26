// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";
import { applyDataViewOperations, createDataView, readDataView, serializeDataView, type DataViewEmbed } from "@quirekit/data-view";
import Inline from "../inline.vue";

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); });

/** @returns A persisted fixture with a hidden multi-select field and a numeric aggregate. */
function fixture(): DataViewEmbed {
  const initial = createDataView("usability");
  if (initial.source.kind !== "inline") throw new Error("Expected inline data");
  const value = applyDataViewOperations(initial, [
    {type: "add-field", field: {id: "effort", name: "工作量", type: "number"}, defaultValue: null},
    {type: "add-field", field: {id: "tags", name: "标签", type: "multiSelect", options: [{id: "design", label: "设计", color: "primary"}]}, defaultValue: null},
    {type: "insert-record", record: {id: "first", values: {title: "设计任务", status: "todo", effort: 8, tags: ["design"]}}}
  ], {baseRevision: initial.source.dataset.revision, revision: "ready"});
  return readDataView({...value, views: value.views.map(view => view.type === "table" ? {...view, visibleFieldIds: ["title", "status", "effort"], summaries: {effort: "sum"}} : view)});
}

/** @param initial - Canonical source. @returns Controlled host matching the document commit boundary. */
async function mount(initial = fixture()) {
  const value = shallowRef(initial), readOnly = shallowRef(false), commits: DataViewEmbed[] = [];
  const root = document.body.appendChild(document.createElement("div"));
  const app = createApp({render: () => h(Inline, {value: value.value, readOnly: readOnly.value, commit: async request => {
    expect(request.base).toBe(serializeDataView(value.value));
    value.value = request.value; commits.push(request.value); return {accepted: true};
  }})});
  app.mount(root); cleanup.push(() => { app.unmount(); root.remove(); }); await nextTick();
  return {root, value, readOnly, commits};
}

/** @param selector - Public semantic selector. @param label - Accessible or visible name. @returns Matching element after Vue and the overlay settle. */
async function control(selector: string, label: string): Promise<HTMLElement> {
  let found: HTMLElement | undefined;
  await expect.poll(() => {
    found = [...document.querySelectorAll<HTMLElement>(selector)].find(element => !element.closest('[hidden], [role="menu"][data-state="closed"]') && (element.getAttribute("aria-label") === label || element.textContent?.trim() === label || element instanceof HTMLInputElement && [...element.labels ?? []].some(item => item.textContent?.trim() === label)));
    return !!found;
  }).toBe(true);
  return found!;
}

/** @param label - Menu action activated with the component's pointer interaction contract. */
async function selectMenu(label: string): Promise<void> {
  const item = await control('[role="menuitem"], [role="menuitemradio"]', label);
  item.dispatchEvent(new PointerEvent("pointerdown", {pointerType: "mouse", bubbles: true}));
  item.dispatchEvent(new PointerEvent("pointerup", {pointerType: "mouse", bubbles: true}));
  item.click();
}

it("copies hidden values with a fresh identity and removes only the selected copy", async () => {
  const {root, value} = await mount();
  (await control("button", "记录操作：设计任务")).click();
  await selectMenu("复制记录");
  await expect.poll(() => root.querySelector(".dv-result-count")?.textContent).toBe("2 条记录");
  if (value.value.source.kind !== "inline") throw new Error("Expected inline data");
  const [original, copy] = value.value.source.dataset.records;
  expect(copy!.id).not.toBe(original!.id);
  expect(copy!.values).toEqual(original!.values);
  expect(copy!.values.tags).not.toBe(original!.values.tags);
  await expect.poll(() => (document.activeElement as HTMLElement | null)?.dataset.dvRecordId).toBe(copy!.id);
  const copyAction = root.querySelector<HTMLButtonElement>(`tr[data-row-key="${copy!.id}"] button[aria-label="记录操作：设计任务"]`)!;
  await expect.poll(() => copyAction.disabled).toBe(false);
  copyAction.click();
  await expect.poll(() => copyAction.getAttribute("aria-expanded")).toBe("true");
  await selectMenu("删除记录");
  await expect.poll(() => root.querySelector(".dv-result-count")?.textContent).toBe("1 条记录");
  expect(value.value.source.dataset.records[0]!.id).toBe("first");
  await expect.poll(() => root.contains(document.activeElement)).toBe(true);
});

it("persists density, visible order and field hiding through the same canonical host", async () => {
  const {root, value} = await mount();
  (await control("button", "外观")).click();
  await selectMenu("紧凑");
  await expect.poll(() => value.value.views[0]).toMatchObject({density: "compact"});
  (await control("button", "字段")).click();
  expect(await control("button", "添加字段")).toBeTruthy();
  (await control("button", "上移工作量")).click();
  await expect.poll(() => value.value.views[0]!.visibleFieldIds).toEqual(["title", "effort", "status"]);
  const status = await control('input[type="checkbox"]', "状态");
  status.click();
  await expect.poll(() => value.value.views[0]!.visibleFieldIds).toEqual(["title", "effort"]);
  expect(root.querySelector('button[aria-label="字段菜单：状态"]')).toBeNull();
  expect(serializeDataView(value.value)).toContain('"density":"compact"');
});

it("folds board columns without removing records and blocks persisted changes in read-only mode", async () => {
  const initial = fixture();
  const board = initial.views.find(view => view.type === "board")!;
  const {root, value, readOnly, commits} = await mount(readDataView({...initial, defaultViewId: board.id}));
  (await control("button", "折叠分组：待办")).click();
  await expect.poll(() => value.value.views.find(view => view.type === "board")).toMatchObject({collapsedGroups: ["todo"]});
  expect(root.querySelectorAll(".dv-card")).toHaveLength(0);
  if (value.value.source.kind !== "inline") throw new Error("Expected inline data");
  expect(value.value.source.dataset.records).toHaveLength(1);
  (await control("button", "展开分组：待办")).click();
  await expect.poll(() => root.querySelectorAll(".dv-card").length).toBe(1);
  readOnly.value = true; await nextTick();
  const before = commits.length, fold = await control("button", "折叠分组：待办");
  await expect.poll(() => fold.hasAttribute("disabled") || fold.getAttribute("aria-disabled") === "true").toBe(true);
  fold.click(); await nextTick();
  expect(commits).toHaveLength(before);
  expect(root.querySelector('[aria-label="记录操作：设计任务"]')).toBeNull();
});
