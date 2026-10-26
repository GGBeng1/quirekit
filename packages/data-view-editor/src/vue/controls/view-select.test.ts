// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";
import { createDataView, type DataViewEmbed, type DataViewSave } from "@quirekit/data-view";
import Inline from "../inline.vue";
import Workspace from "../workspace.vue";

const cleanup: (() => void)[] = [];
let instance = 0;
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); });

/** @param rejected - Whether the document rejects a view change. @param wait - Optional host save delay. @returns Controlled inline host. */
async function mountInline(rejected = false, wait?: Promise<void>) {
  const value = shallowRef(createDataView("view-select")), readOnly = shallowRef(false), commits: DataViewEmbed[] = [];
  const root = document.body.appendChild(document.createElement("div"));
  const app = createApp({render: () => h(Inline, {value: value.value, readOnly: readOnly.value, commit: async save => {
    if (wait) await wait;
    if (rejected) return {accepted: false, message: "视图保存被拒绝"};
    value.value = save.value; commits.push(save.value); return {accepted: true};
  }})});
  app.config.idPrefix = `view-select-${instance++}`;
  app.mount(root); cleanup.push(() => { app.unmount(); root.remove(); }); await nextTick();
  return {root, value, readOnly, commits};
}

/** @param root - Owning surface. @returns Public view-selection trigger. */
function trigger(root: HTMLElement): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>('[role="combobox"][aria-label="切换视图"]');
  expect(button).not.toBeNull(); return button!;
}

/** @param root - Owning surface. @param label - Authored view label. */
async function select(root: HTMLElement, label: string): Promise<void> {
  const button = trigger(root); button.click();
  let option: HTMLElement | undefined;
  await expect.poll(() => {
    const listbox = document.getElementById(button.getAttribute("aria-controls") ?? "");
    option = [...listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? []].find(item => item.textContent?.trim() === label);
    return !!option;
  }).toBe(true);
  option!.click(); await nextTick();
  await expect.poll(() => button.getAttribute("aria-expanded")).toBe("false");
  if (!button.disabled) await expect.poll(() => document.activeElement).toBe(button);
}

it("selects a real view from a dropdown and persists the default through the document host", async () => {
  const {root, value, commits} = await mountInline();
  expect(root.querySelector('[role="tablist"]')).toBeNull();
  expect(trigger(root).textContent).toBe("表格");
  await select(root, "看板");
  await expect.poll(() => value.value.defaultViewId).toBe(value.value.views[1]!.id);
  expect(root.querySelector('.dv-board')).not.toBeNull();
  expect(root.querySelectorAll('[role="region"]')).toHaveLength(1);
  expect(commits).toHaveLength(1);
  await select(root, "表格");
  await expect.poll(() => value.value.defaultViewId).toBe(value.value.views[0]!.id);
  expect(root.querySelector('.dv-table-surface')).not.toBeNull();
});

it("keeps read-only navigation transient and restores the canonical view when a write is rejected", async () => {
  const readonly = await mountInline();
  readonly.readOnly.value = true; await nextTick();
  await select(readonly.root, "看板");
  expect(trigger(readonly.root).textContent).toBe("看板");
  expect(readonly.value.value.defaultViewId).toBe(readonly.value.value.views[0]!.id);
  expect(readonly.commits).toHaveLength(0);
  const rejected = await mountInline(true);
  await select(rejected.root, "看板");
  await expect.poll(() => rejected.root.querySelector('[role="alert"]')?.textContent).toBe("视图保存被拒绝");
  expect(trigger(rejected.root).textContent).toBe("表格");
  expect(rejected.root.querySelector('.dv-table-surface')).not.toBeNull();
});

it("disables the selector for an outstanding save and keeps Escape local to the view menu", async () => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const {root, commits} = await mountInline(false, wait);
  const button = trigger(root);
  button.focus(); button.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowDown", bubbles: true, cancelable: true}));
  await expect.poll(() => button.getAttribute("aria-expanded")).toBe("true");
  document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true}));
  await expect.poll(() => button.getAttribute("aria-expanded")).toBe("false");
  await expect.poll(() => document.activeElement).toBe(button);
  expect(commits).toHaveLength(0);
  await select(root, "看板");
  await expect.poll(() => button.disabled).toBe(true);
  release();
  await expect.poll(() => commits).toHaveLength(1);
  await expect.poll(() => button.disabled).toBe(false);
});

it("keeps the shared workspace choice in its draft until Apply and follows host busy state", async () => {
  const initial = createDataView("workspace-select"), busy = shallowRef(false), saves: DataViewSave[] = [];
  const root = document.body.appendChild(document.createElement("div"));
  const app = createApp({render: () => h(Workspace, {value: initial, busy: busy.value, onApply: save => saves.push(save)})});
  app.mount(root); cleanup.push(() => { app.unmount(); root.remove(); }); await nextTick();
  await select(root, "看板");
  expect(root.querySelector('.dv-board')).not.toBeNull();
  expect(initial.defaultViewId).toBe(initial.views[0]!.id); expect(saves).toHaveLength(0);
  [...root.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "应用")!.click();
  expect(saves[0]!.value.defaultViewId).toBe(initial.views[1]!.id);
  busy.value = true; await nextTick();
  expect(trigger(root).disabled).toBe(true);
});
