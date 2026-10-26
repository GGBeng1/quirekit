// @vitest-environment happy-dom
import { createApp, createVNode, h, nextTick, reactive, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitChoiceSubmitRequest } from "../../components/choice-picker/types";
import type { QuireKitTaskApi } from "../../components/task/types";
import DialogRoot from "../dialog/root.vue";
import DialogContent from "../dialog/content.vue";
import Picker from "./root.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/** @param initial - Live public host bindings. @param parent - Optional retained modal owner. @returns Mounted real Picker and host controls. */
async function fixture(initial: Record<string, unknown> = {}, parent?: boolean) {
  const state = reactive<Record<string, unknown>>({ presentation: "desktop", ...initial });
  const parentOpen = ref(parent ?? true);
  const api = ref<QuireKitTaskApi>();
  const events = { update: vi.fn(), open: vi.fn(), value: vi.fn(), commit: vi.fn(), error: vi.fn(), search: vi.fn(), query: vi.fn(), cancel: vi.fn() };
  const host = document.createElement("div");
  const outside = document.createElement("button"); outside.textContent = "Outside";
  document.body.append(outside, host); outside.focus();
  /** @returns The actual public SFC, without mocking either surface or the Listbox. */
  function picker() {
    return createVNode(Picker, {
      title: "选择成员", selectionMode: "single", items: [{ value: "a", label: "Alice" }, { value: "b", label: "Bob" }, { value: "c", label: "Carol", disabled: true }], ...state,
      ref: api, "onUpdate:open": events.update, onOpenChange: events.open, "onUpdate:modelValue": events.value,
      onCommit: events.commit, onError: events.error, onSearchRequest: events.search, "onUpdate:query": events.query, onCancel: events.cancel
    }, { trigger: () => h("button", {}, "选择成员") });
  }
  const app = createApp({ render: () => parent === undefined ? picker() : h(DialogRoot, {
    open: parentOpen.value, lazyMount: false, unmountOnExit: false
  }, () => h(DialogContent, { title: "父任务" }, picker)) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); outside.remove(); });
  await nextTick();
  /** @returns The persistent task's real physical button, including when its owner is portalled. */
  function trigger() { return document.querySelector<HTMLButtonElement>('[id^="selection-task-"][id$="-trigger"]')!; }
  /** @returns The current task dialog, never its parent. */
  function content() { return document.querySelector<HTMLElement>('[id^="selection-task-"][id$="-content"]')!; }
  return { state, parentOpen, api, events, outside, trigger, content };
}

/** @param root - Current task. @param value - Stable option identity. @returns Actual Listbox option. */
function option(root: HTMLElement, value: string): HTMLElement { return root.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`)!; }
/** @param root - Current task. @param text - Exact readable control label. @returns Actual task button. */
function button(root: HTMLElement, text: string): HTMLButtonElement { return [...root.querySelectorAll("button")].find(node => node.textContent === text)!; }
/** @param input - Existing search element. @param value - Native input text. */
function inputText(input: HTMLInputElement, value: string): void { input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); }

for (const presentation of ["desktop", "bottom"] as const) {
  it(`${presentation}: controlled false overrides default true; one stable trigger opens one dialog and Listbox`, async () => {
    const { state, trigger, content, events, outside } = await fixture({ presentation, open: false, defaultOpen: true });
    const entry = trigger();
    expect(entry.getAttribute("aria-expanded")).toBe("false");
    expect(content()).toBeNull();
    expect(document.activeElement).toBe(outside);
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(events.open).not.toHaveBeenCalled();
    entry.click();
    await vi.waitFor(() => expect(events.update).toHaveBeenCalledWith(true));
    expect(content()).toBeNull();
    state.open = true;
    await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
    expect(document.querySelectorAll('[id^="selection-task-"][id$="-content"]')).toHaveLength(1);
    expect(content().getAttribute("role")).toBe("dialog");
    expect(content().getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.getElementById(content().getAttribute("aria-labelledby")!)?.textContent).toBe("选择成员");
    expect(content().querySelectorAll('[role="listbox"]')).toHaveLength(1);
    expect(content().querySelector('[aria-label="关闭"]')?.classList.contains('qk-button--neutral-text')).toBe(true);
    expect(button(content(), "取消").classList.contains('qk-button--neutral-text')).toBe(true);
    expect(entry.getAttribute("aria-controls")).toBe(content().id);
    option(content(), "c").click();
    expect(events.commit).not.toHaveBeenCalled();
    option(content(), "b").click();
    await vi.waitFor(() => expect(events.value).toHaveBeenCalledExactlyOnceWith(["b"]));
    expect(events.commit).toHaveBeenCalledOnce();
    expect(entry).toBe(trigger());
    expect(content().dataset.state).toBe("open");
    state.open = false;
    await vi.waitFor(() => expect(trigger().getAttribute("aria-expanded")).toBe("false"));
    await vi.waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });

  it(`${presentation}: multiple draft waits for confirmation and cancellation discards query without replacing input`, async () => {
    const { trigger, content, events } = await fixture({ presentation, defaultOpen: true, selectionMode: "multiple", defaultValue: ["a"], searchable: true });
    await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
    const search = content().querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(search.getAttribute("role")).not.toBe("combobox");
    option(content(), "b").click(); await nextTick();
    expect(events.value).not.toHaveBeenCalled();
    expect(option(content(), "a").getAttribute("aria-selected")).toBe("true");
    expect(option(content(), "b").getAttribute("aria-selected")).toBe("true");
    search.focus(); inputText(search, "Bob"); await nextTick();
    expect(content().querySelector("input")).toBe(search);
    expect(document.activeElement).toBe(search);
    expect(content().querySelectorAll('[role="option"]')).toHaveLength(1);
    button(content(), "取消").click();
    await vi.waitFor(() => expect(trigger().getAttribute("aria-expanded")).toBe("false"));
    expect(events.commit).not.toHaveBeenCalled();
    const priorSearch = events.search.mock.calls[0]![0];
    expect(priorSearch.signal.aborted).toBe(true);
    trigger().click();
    await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
    expect(content().querySelector<HTMLInputElement>("input")!.value).toBe("");
    expect(option(content(), "a").getAttribute("aria-selected")).toBe("true");
    expect(option(content(), "b").getAttribute("aria-selected")).toBe("false");
    expect(events.search).toHaveBeenCalledOnce();
  });
}

it("keeps the query and highlight through rejection/retry and blocks busy close without disabling focus", async () => {
  let reject!: (error: unknown) => void;
  const pending = new Promise<void>((_resolve, refuse) => { reject = refuse; });
  const submit = vi.fn().mockImplementationOnce(() => pending).mockImplementationOnce(() => {});
  const { api, content, trigger, events } = await fixture({ defaultOpen: true, selectionMode: "multiple", searchable: true, submit });
  await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
  const search = content().querySelector<HTMLInputElement>("input")!;
  option(content(), "b").click(); search.focus(); inputText(search, "Bob"); await nextTick();
  button(content(), "完成").click(); button(content(), "完成").click();
  expect(submit).toHaveBeenCalledOnce();
  expect(api.value!.requestClose("cancel")).toBe(false);
  await nextTick();
  expect(search.readOnly).toBe(true);
  expect(search.disabled).toBe(false);
  expect(content().querySelector("input")).toBe(search);
  reject(new Error("offline"));
  await vi.waitFor(() => expect(content().querySelector('[role="alert"]')?.textContent).toContain("操作未完成"));
  expect(search.value).toBe("Bob");
  expect(search.readOnly).toBe(false);
  expect(content().querySelectorAll('[role="alert"],[role="status"]')).toHaveLength(1);
  button(content(), "重试").click();
  await vi.waitFor(() => expect(events.commit).toHaveBeenCalledOnce());
  expect(submit.mock.calls[1]![0].requestId).toBeGreaterThan(submit.mock.calls[0]![0].requestId);
  await vi.waitFor(() => expect(trigger().getAttribute("aria-expanded")).toBe("false"));
});

it("does not submit or dismiss during IME and emits the completed query once", async () => {
  const { content, events } = await fixture({ defaultOpen: true, searchable: true, selectionMode: "multiple" });
  await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
  const search = content().querySelector<HTMLInputElement>("input")!;
  search.focus(); search.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
  inputText(search, "zhong");
  const enter = new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true });
  search.dispatchEvent(enter);
  search.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", isComposing: true, bubbles: true, cancelable: true }));
  await nextTick();
  expect(events.commit).not.toHaveBeenCalled(); expect(events.search).not.toHaveBeenCalled();
  expect(content().dataset.state).toBe("open");
  search.value = "中文"; search.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
  inputText(search, "中文"); await nextTick();
  expect(events.query).toHaveBeenCalledExactlyOnceWith("中文");
  expect(events.search).toHaveBeenCalledOnce();
  expect(content().querySelector("input")).toBe(search);
});

it("honors external values and host closure during submission without replacing the query node", async () => {
  let resolve!: () => void;
  const pending = new Promise<void>(accept => { resolve = accept; });
  const submit = vi.fn((_request: QuireKitChoiceSubmitRequest) => pending);
  const { state, content, events } = await fixture({ open: true, modelValue: ["a"], searchable: true, submit });
  await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
  const search = content().querySelector<HTMLInputElement>("input")!;
  inputText(search, "Bob"); await nextTick(); option(content(), "b").click();
  await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
  state.modelValue = ["c"]; await nextTick();
  expect(submit.mock.calls[0]![0].signal.aborted).toBe(true);
  expect(content().querySelector("input")).toBe(search);
  expect(search.value).toBe("Bob");
  resolve(); await nextTick(); await nextTick();
  expect(events.commit).not.toHaveBeenCalled();
  inputText(search, ""); await nextTick();
  expect(option(content(), "c").getAttribute("aria-selected")).toBe("true");
  state.open = false;
  await vi.waitFor(() => expect(events.open.mock.calls.at(-1)).toEqual([false]));
  expect(events.update).not.toHaveBeenCalledWith(false);
});

it("disabled ends a local default-open session and enabling does not silently reopen", async () => {
  const { state, trigger, content, events } = await fixture({ defaultOpen: true, searchable: true, selectionMode: "multiple" });
  await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
  option(content(), "b").click();
  state.disabled = true;
  await vi.waitFor(() => expect(trigger().disabled).toBe(true));
  expect(events.cancel.mock.calls.at(-1)![0].reason).toBe("disabled");
  state.disabled = false; await nextTick();
  expect(trigger().getAttribute("aria-expanded")).toBe("false");
  trigger().click();
  await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
  expect(option(content(), "b").getAttribute("aria-selected")).toBe("false");
});

it("ends retained owner sessions, aborts requests, and reopens from host state without replaying business", async () => {
  let resolve!: () => void;
  const pending = new Promise<void>(accept => { resolve = accept; });
  const submit = vi.fn((_request: QuireKitChoiceSubmitRequest) => pending);
  const { parentOpen, content, events } = await fixture({ open: true, defaultOpen: true, modelValue: ["a"], searchable: true, submit }, false);
  expect(content()).toBeNull();
  expect(events.open).not.toHaveBeenCalled();
  expect(document.body.style.overflow).not.toBe("hidden");
  parentOpen.value = true;
  await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
  const search = content().querySelector<HTMLInputElement>("input")!;
  inputText(search, "Bob"); await nextTick(); option(content(), "b").click();
  await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
  const request = submit.mock.calls[0]![0];
  parentOpen.value = false;
  await vi.waitFor(() => expect(request.signal.aborted).toBe(true));
  expect(events.update).not.toHaveBeenCalledWith(false);
  expect(events.cancel.mock.calls.at(-1)![0].reason).toBe("owner-hidden");
  parentOpen.value = true;
  await vi.waitFor(() => expect(content()?.dataset.state).toBe("open"));
  resolve(); await nextTick(); await nextTick();
  expect(events.commit).not.toHaveBeenCalled();
  expect(content().querySelector<HTMLInputElement>("input")!.value).toBe("");
  expect(option(content(), "a").getAttribute("aria-selected")).toBe("true");
  expect(submit).toHaveBeenCalledOnce();
  expect(events.search).toHaveBeenCalledOnce();
  expect(events.open.mock.calls.map(([value]) => value)).toEqual([true, false, true]);
});
