// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitActionMenuEntry, QuireKitActionMenuProps, QuireKitActionMenuRequest } from "../../components/action-menu";
import type { QuireKitTaskApi } from "../../components/task";
import ActionMenu from "./root.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).reverse().forEach(cleanup => cleanup()); vi.restoreAllMocks(); });
/** @param element - Native action target receiving a complete pointer activation. */
function activate(element: HTMLElement): void {
  element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 }));
  element.click();
}
const actions: readonly QuireKitActionMenuEntry[] = [
  { kind: "command", value: "copy", label: "复制" },
  { kind: "branch", value: "move", label: "移动到", children: [
    { kind: "command", value: "archive", label: "归档" },
    { kind: "branch", value: "empty", label: "空目录", children: [] }
  ] },
  { kind: "command", value: "delete", label: "删除", disabled: true }
];

/** @param options - Public task settings. @returns Actual SFC controls and public event observations. */
async function mountTask(options: Partial<QuireKitActionMenuProps> = {}) {
  const props = reactive<QuireKitActionMenuProps>({ title: "文件操作", actions, presentation: "desktop", ...options });
  const api = ref<QuireKitTaskApi>();
  const action = vi.fn(), error = vi.fn(), cancel = vi.fn(), openChange = vi.fn(), update = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(ActionMenu, {
    ...props, ref: api, onAction: action, onError: error, onCancel: cancel, onOpenChange: openChange, "onUpdate:open": update
  }, { trigger: () => h("button", "打开操作"), context: () => h("span", "文件区域") }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>("button")!;
  /** @param value - Visible action identity. @returns Current menu or bottom action row. */
  function row(value: string): HTMLElement {
    return document.querySelector<HTMLElement>(`[data-action-value="${value}"], [role="menuitem"][data-value="${value}"]`)!;
  }
  return { props, api, action, error, cancel, openChange, update, trigger, host, row };
}

for (const presentation of ["desktop", "bottom"] as const) {
  it(`opens one ${presentation} surface from the unchanged real trigger and executes once`, async () => {
    const execute = vi.fn();
    const fixture = await mountTask({ presentation, execute });
    fixture.trigger.click();
    await vi.waitFor(() => expect(fixture.row("copy"), JSON.stringify({ html: document.body.innerHTML, updates: fixture.update.mock.calls, changes: fixture.openChange.mock.calls })).not.toBeNull());
    expect(fixture.host.querySelector("button")).toBe(fixture.trigger);
    expect(document.querySelectorAll('[role="menu"], [role="dialog"]')).toHaveLength(1);
    expect(fixture.trigger.getAttribute("aria-controls")).toBe(document.querySelector('[role="menu"], [role="dialog"]')!.id);
    activate(fixture.row("delete"));
    expect(execute).not.toHaveBeenCalled();
    activate(fixture.row("copy"));
    await vi.waitFor(() => expect(execute, fixture.row("copy")?.outerHTML + JSON.stringify(fixture.openChange.mock.calls)).toHaveBeenCalledOnce());
    expect(execute.mock.calls[0]![0]).toMatchObject({ value: "copy", path: [], signal: expect.any(AbortSignal) });
    expect(fixture.action).toHaveBeenCalledOnce();
    expect(fixture.cancel).not.toHaveBeenCalled();
    expect(fixture.openChange.mock.calls).toEqual([[true], [false]]);
  });

  it(`keeps ${presentation} actions stable through pending, rejected and successful retry`, async () => {
    let reject!: (error: unknown) => void;
    const execute = vi.fn<NonNullable<QuireKitActionMenuProps["execute"]>>()
      .mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail; }))
      .mockResolvedValueOnce(undefined);
    const fixture = await mountTask({ presentation, execute, errorText: "复制失败，重试" });
    fixture.trigger.click();
    await vi.waitFor(() => expect(fixture.row("copy")).not.toBeNull());
    const original = fixture.row("copy");
    original.focus(); activate(original); activate(original);
    const focused = document.activeElement;
    await nextTick();
    expect(execute).toHaveBeenCalledOnce();
    expect(fixture.api.value!.requestClose("escape")).toBe(false);
    expect(document.querySelector('[role="status"]')?.textContent).toBe("正在处理…");
    expect(document.activeElement).toBe(focused);
    reject(new Error("offline"));
    await vi.waitFor(() => expect(fixture.error).toHaveBeenCalledOnce());
    expect(fixture.row("copy")).toBe(original);
    expect(document.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("复制失败，重试");
    activate(original);
    await vi.waitFor(() => expect(fixture.action).toHaveBeenCalledOnce());
    expect(execute).toHaveBeenCalledTimes(2);
    expect(fixture.cancel).not.toHaveBeenCalled();
  });
}

it("keeps bottom branch state and restores parent focus across empty directories", async () => {
  const execute = vi.fn();
  const fixture = await mountTask({ presentation: "bottom", execute });
  fixture.trigger.click();
  await vi.waitFor(() => expect(fixture.row("move")).not.toBeNull());
  activate(fixture.row("move"));
  await vi.waitFor(() => expect(fixture.row("archive")).not.toBeNull());
  expect(document.activeElement).toBe(fixture.row("archive"));
  activate(fixture.row("empty"));
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("暂无可用操作"));
  expect(document.activeElement?.getAttribute("role")).toBe("dialog");
  [...document.querySelectorAll("button")].find(button => button.textContent === "返回")!.click();
  await vi.waitFor(() => expect(document.activeElement).toBe(fixture.row("empty")));
  activate(fixture.row("archive"));
  await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
  expect(execute.mock.calls[0]![0]).toMatchObject({ value: "archive", path: ["move"] });
});

it("restores a searched grid directory and its original action on branch return", async () => {
  const execute = vi.fn(), fixture = await mountTask({ presentation: "bottom", layout: "grid", searchable: true, execute });
  fixture.trigger.click(); await vi.waitFor(() => expect(fixture.row("move")).not.toBeNull());
  const search = document.querySelector<HTMLInputElement>('input[type="search"]')!;
  search.value = "移动"; search.dispatchEvent(new Event("input", { bubbles: true })); await nextTick();
  expect(fixture.row("copy")).toBeNull(); expect(fixture.row("move").parentElement?.className).toContain("--grid");
  activate(fixture.row("move")); await vi.waitFor(() => expect(fixture.row("archive")).not.toBeNull());
  expect(search.value).toBe("");
  [...document.querySelectorAll("button")].find(button => button.textContent === "返回")!.click();
  await vi.waitFor(() => expect(search.value).toBe("移动")); expect(document.activeElement).toBe(fixture.row("move"));
  expect(execute).not.toHaveBeenCalled();
});

it("honors controlled false over defaultOpen and isolates completion after authoritative host close", async () => {
  let finish!: () => void;
  let request: QuireKitActionMenuRequest | undefined;
  const fixture = await mountTask({ open: false, defaultOpen: true, execute: details => {
    request = details;
    return new Promise<void>(resolve => { finish = resolve; });
  } });
  expect(document.querySelector('[role="menu"]')).toBeNull();
  Object.assign(fixture.props, { open: true });
  await vi.waitFor(() => expect(fixture.row("copy")).not.toBeNull());
  activate(fixture.row("copy"));
  await vi.waitFor(() => expect(request).toBeDefined());
  Object.assign(fixture.props, { open: false });
  await nextTick();
  expect(request!.signal.aborted).toBe(true);
  finish();
  await nextTick();
  expect(fixture.action).not.toHaveBeenCalled();
  expect(fixture.error).not.toHaveBeenCalled();
  expect(fixture.cancel.mock.calls[0]![0]).toMatchObject({ reason: "host-close" });
  Object.assign(fixture.props, { open: true });
  await vi.waitFor(() => expect(fixture.row("copy")).not.toBeNull());
  expect(fixture.openChange.mock.calls).toEqual([[true], [false], [true]]);
});

it("lets actual presence complete only the final close after a quick controlled reopen", async () => {
  const fixture = await mountTask({ open: true, presentation: "desktop" });
  await vi.waitFor(() => expect(fixture.row("copy")).not.toBeNull());
  const trigger = fixture.trigger;
  Object.assign(fixture.props, { open: false, presentation: "bottom" });
  await nextTick();
  Object.assign(fixture.props, { open: true });
  await nextTick();
  expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await new Promise(resolve => window.requestAnimationFrame(resolve));
  expect(document.querySelector('[role="menu"]')?.getAttribute("data-state")).toBe("open");
  Object.assign(fixture.props, { open: false });
  await vi.waitFor(() => expect(trigger.getAttribute("aria-haspopup")).toBe("dialog"));
  Object.assign(fixture.props, { open: true });
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.getAttribute("data-state")).toBe("open"));
  expect(fixture.host.querySelector("button")).toBe(trigger);
  expect(document.querySelector('[role="menu"]')).toBeNull();
});

it("uses a context keyboard entry as the final focus owner without treating composition as an opening", async () => {
  const fixture = await mountTask();
  const region = fixture.host.querySelector<HTMLElement>('[role="group"]')!;
  region.focus();
  region.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", shiftKey: true, bubbles: true, isComposing: true, cancelable: true }));
  expect(fixture.openChange).not.toHaveBeenCalled();
  region.dispatchEvent(new KeyboardEvent("keydown", { key: "F10", shiftKey: true, bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(fixture.row("copy")).not.toBeNull());
  fixture.row("copy").focus();
  activate(fixture.row("copy"));
  await vi.waitFor(() => expect(fixture.action).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(document.activeElement).toBe(region));
});

it("takes the bottom task chrome from the active language", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const english: readonly QuireKitActionMenuEntry[] = [{ kind: "branch", value: "move", label: "Move to", children: [] }];
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale: "en" }, () => h(ActionMenu, {
    title: "File actions", actions: english, presentation: "bottom", defaultOpen: true
  }, { trigger: () => h("button", "Open") })) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await vi.waitFor(() => expect(document.querySelector('[data-action-value="move"]')).not.toBeNull());
  activate(document.querySelector<HTMLElement>('[data-action-value="move"]')!);
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("No actions available"));
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("Back");
  expect(dialog.textContent).toContain("Cancel");
  expect(dialog.querySelector('[aria-label="Close"]')).not.toBeNull();
  expect(dialog.textContent).not.toMatch(/[\p{Script=Han}]/u);
});
