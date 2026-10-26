// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";
import { createDataView, type DataViewEmbed, type DataViewSave } from "@quirekit/data-view";
import * as dataView from "@quirekit/data-view";
import Inline from "../inline.vue";
import Workspace from "../workspace.vue";

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(dispose => dispose()); vi.restoreAllMocks(); });

/** @param rejected - Whether the host refuses schema edits. @param wait - Optional persistence delay. @returns Canonical inline editor host. */
async function mount(rejected = false, wait?: Promise<void>) {
  const value = shallowRef(createDataView("field-panel")), readOnly = shallowRef(false), commits: DataViewEmbed[] = [];
  const root = document.body.appendChild(document.createElement("div"));
  const app = createApp({render: () => h(Inline, {value: value.value, readOnly: readOnly.value, commit: async save => {
    if (wait) await wait;
    if (rejected) return {accepted: false, message: "保存失败，草稿已保留"};
    value.value = save.value; commits.push(save.value); return {accepted: true};
  }})});
  app.config.idPrefix = "field-workflow";
  app.mount(root); cleanup.push(() => { app.unmount(); root.remove(); }); await nextTick();
  return {root, value, readOnly, commits};
}

/** @param title - Current task title. @returns Live accessible task surface. */
async function panel(title = "添加字段"): Promise<HTMLElement> {
  let found: HTMLElement | undefined;
  await expect.poll(() => {
    found = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].find(element => !element.closest("[hidden], [inert]") && element.getAttribute("aria-hidden") !== "true" && (element.getAttribute("aria-label") === title || document.getElementById(element.getAttribute("aria-labelledby") ?? "")?.textContent === title));
    return !!found;
  }).toBe(true);
  return found!;
}

/** @param scope - Owned task surface. @param value - Authored field name. */
async function name(scope: HTMLElement, value: string): Promise<void> {
  const input = scope.querySelector<HTMLInputElement>("input")!;
  input.value = value; input.dispatchEvent(new Event("input", {bubbles: true})); await nextTick();
}

/** @param scope - Owned task surface. @param text - Visible action name. */
function button(scope: HTMLElement, text: string): void {
  [...scope.querySelectorAll<HTMLButtonElement>("button")].find(element => element.textContent === text)!.click();
}

it("opens the column-end field task outside the document and saves one visible field", async () => {
  const query = vi.spyOn(dataView, "queryDataTable");
  const {root, value, commits} = await mount();
  expect(query).toHaveBeenCalledTimes(1);
  const trigger = root.querySelector<HTMLButtonElement>('[aria-label="添加字段"]')!;
  expect(trigger).not.toBeNull(); trigger.focus(); trigger.click();
  const task = await panel();
  expect(root.querySelector(".dv-fields")).toBeNull(); expect(root.contains(task)).toBe(false);
  expect(task.querySelector('input')!.closest('form')).not.toBeNull();
  await name(task, "负责人"); expect(query).toHaveBeenCalledTimes(1); button(task, "创建字段");
  await expect.poll(() => commits).toHaveLength(1);
  if (value.value.source.kind !== "inline") throw new Error("Expected local data");
  const field = value.value.source.dataset.fields.find(field => field.name === "负责人")!;
  expect(value.value.views[0]!.visibleFieldIds).toContain(field.id);
  expect(value.value.views[1]!.visibleFieldIds).not.toContain(field.id);
  await expect.poll(() => root.querySelector(`[aria-label="字段菜单：负责人"]`)).not.toBeNull();
  await expect.poll(() => document.activeElement).toBe(trigger);
});

it("cancels without creating data and keeps failed names inside the task for retry", async () => {
  const {root, commits} = await mount(true);
  const trigger = root.querySelector<HTMLButtonElement>('[aria-label="添加字段"]')!;
  trigger.click(); const task = await panel();
  await name(task, "待重试字段"); button(task, "创建字段");
  await expect.poll(() => task.querySelector('[role="alert"]')?.textContent).toBe("保存失败，草稿已保留");
  expect(root.querySelector('[role="alert"]')).toBeNull();
  expect(task.querySelector<HTMLInputElement>("input")!.value).toBe("待重试字段");
  button(task, "取消");
  await expect.poll(() => document.activeElement).toBe(trigger);
  expect(root.querySelector('[role="alert"]')).toBeNull();
  expect(commits).toHaveLength(0);
});

it("edits from the column menu and dismisses a nested type choice before the field task", async () => {
  const {root, value, commits} = await mount();
  const trigger = root.querySelector<HTMLButtonElement>('[aria-label="字段菜单：状态"]')!;
  trigger.click();
  let edit: HTMLElement | undefined;
  await expect.poll(() => { edit = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent?.trim() === "编辑字段"); return !!edit; }).toBe(true);
  edit!.dispatchEvent(new PointerEvent("pointerdown", {pointerType: "mouse", bubbles: true}));
  edit!.dispatchEvent(new PointerEvent("pointerup", {pointerType: "mouse", bubbles: true})); edit!.click();
  const task = await panel("编辑字段");
  const type = task.querySelector<HTMLButtonElement>('[role="combobox"][aria-label="字段类型"]')!;
  type.click(); await expect.poll(() => type.getAttribute("aria-expanded")).toBe("true");
  document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true}));
  await expect.poll(() => type.getAttribute("aria-expanded")).toBe("false");
  expect(task.getAttribute("aria-hidden")).not.toBe("true");
  await expect.poll(() => document.activeElement).toBe(type);
  await name(task, "任务状态"); button(task, "保存字段");
  await expect.poll(() => value.value.source.kind === "inline" && value.value.source.dataset.fields[1]!.name).toBe("任务状态");
  expect(commits).toHaveLength(1);
});

it("opens from field management and closes an unavailable editor when permissions change", async () => {
  const {root, readOnly, commits} = await mount();
  button(root, "字段");
  let add: HTMLButtonElement | undefined;
  await expect.poll(() => { add = [...document.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent === "添加字段"); return !!add; }).toBe(true);
  add!.click(); const task = await panel(); await name(task, "未保存");
  readOnly.value = true;
  await expect.poll(() => task.isConnected && task.getAttribute("aria-hidden") !== "true" && !task.hasAttribute("inert")).toBe(false);
  expect(root.querySelector('[aria-label="添加字段"]')).toBeNull(); expect(commits).toHaveLength(0);
});

it("creates and reveals a field in one shared-workspace undo step", async () => {
  const initial = createDataView("field-draft"), saves: DataViewSave[] = [];
  const root = document.body.appendChild(document.createElement("div"));
  const app = createApp({render: () => h(Workspace, {value: initial, onApply: save => saves.push(save)})});
  app.mount(root); cleanup.push(() => { app.unmount(); root.remove(); }); await nextTick();
  root.querySelector<HTMLButtonElement>('[aria-label="添加字段"]')!.click();
  const task = await panel(); await name(task, "新字段"); button(task, "创建字段");
  await expect.poll(() => root.querySelector('[aria-label="字段菜单：新字段"]')).not.toBeNull();
  await expect.poll(() => task.isConnected && !task.hasAttribute("inert") && task.getAttribute("aria-hidden") !== "true").toBe(false);
  button(root, "撤销"); button(root, "应用");
  expect(saves[0]!.value).toEqual(initial);
});

it("guards the complete pending save, retaining the draft after a failed receipt", async () => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const {root, commits} = await mount(true, wait);
  root.querySelector<HTMLButtonElement>('[aria-label="添加字段"]')!.click();
  const task = await panel(); await name(task, "保留的名称"); button(task, "创建字段"); await nextTick();
  expect(task.querySelector<HTMLInputElement>("input")!.readOnly).toBe(true);
  expect(task.querySelector<HTMLButtonElement>('[role="combobox"]')!.disabled).toBe(true);
  expect([...task.querySelectorAll<HTMLButtonElement>("button")].filter(button => button.textContent === "取消" || button.textContent === "创建字段").every(button => button.disabled)).toBe(true);
  task.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true}));
  expect(task.getAttribute("aria-hidden")).not.toBe("true");
  release();
  await expect.poll(() => task.querySelector('[role="alert"]')?.textContent).toBe("保存失败，草稿已保留");
  expect(task.querySelector<HTMLInputElement>("input")!.value).toBe("保留的名称"); expect(commits).toHaveLength(0);
});

it("invalidates an open source snapshot and cancels a not-yet-open menu handoff", async () => {
  const {root, value, readOnly, commits} = await mount();
  const trigger = root.querySelector<HTMLButtonElement>('[aria-label="添加字段"]')!;
  trigger.click(); const task = await panel(); await name(task, "旧来源草稿");
  value.value = createDataView("replacement");
  await expect.poll(() => task.isConnected && !task.hasAttribute("inert") && task.getAttribute("aria-hidden") !== "true").toBe(false);
  await expect.poll(() => root.contains(document.activeElement)).toBe(true);
  trigger.click(); readOnly.value = true; await nextTick();
  await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
  expect([...document.querySelectorAll<HTMLElement>('[role="dialog"]')].some(element => element.getAttribute("aria-label") === "添加字段" && !element.closest("[inert], [hidden]") && element.getAttribute("aria-hidden") !== "true")).toBe(false);
  expect(commits).toHaveLength(0);
});

it("uses the public bottom-panel presentation in a narrow owner viewport", async () => {
  const matchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation(query => {
    const result = matchMedia(query);
    if (query === "(min-width: 768px)") Object.defineProperty(result, "matches", {value: false});
    return result;
  });
  const {root, commits} = await mount();
  const trigger = root.querySelector<HTMLButtonElement>('[aria-label="添加字段"]')!;
  trigger.click(); const task = await panel();
  expect(task.getAttribute("data-swipe-direction")).toBe("down");
  expect(task.getAttribute("aria-modal")).toBe("true");
  await name(task, "窄屏草稿"); button(task, "取消");
  await expect.poll(() => document.activeElement, { timeout: 5000 }).toBe(trigger); expect(commits).toHaveLength(0);
}, 15000);
