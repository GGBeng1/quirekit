// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitPresetPickerProps, QuireKitPresetSubmitRequest } from "../../components/preset-picker/types";
import type { QuireKitPresetGalleryItemSlotProps } from "../../components/preset-gallery/types";
import type { QuireKitTaskApi } from "../../components/task/types";
import PresetPicker from "./root.vue";
import DialogRoot from "../dialog/root.vue";
import DialogContent from "../dialog/content.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));
const items = [
  { value: "plain", label: "正文", data: { sample: "Plain preview" } },
  { value: "heading", label: "标题", data: { sample: "Heading preview" } },
  { value: "disabled", label: "不可用", disabled: true }
] as const;

/**
 * Mounts the actual picker and existing Gallery with public event observations.
 * @param overrides - Public host settings for this scenario.
 * @returns Public controls and current original widget nodes.
 */
async function mountPicker(overrides: Partial<QuireKitPresetPickerProps> = {}) {
  const props = reactive<QuireKitPresetPickerProps>({ title: "文本样式", items, presentation: "desktop", ...overrides });
  const api = ref<QuireKitTaskApi>();
  const update = vi.fn(), commit = vi.fn(), error = vi.fn(), cancel = vi.fn(), openChange = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(PresetPicker, { ...props, ref: api,
    "onUpdate:modelValue": update, onCommit: commit, onError: error, onCancel: cancel, onOpenChange: openChange
  }, {
    trigger: () => h("button", "选择样式"),
    preview: ({ item }: QuireKitPresetGalleryItemSlotProps) => h("span", { "data-preview": item.value }, String(item.data?.sample ?? "Preview")),
    empty: () => h("p", "没有可用的样式")
  }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>("button")!;
  /** @param value - Preset identity. @returns Actual Gallery option when mounted. */
  function option(value: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`.qk-preset-picker__options [role="option"][data-value="${value}"]`);
  }
  /** @param text - Visible action text. @returns Existing shared task button. */
  function button(text: string): HTMLButtonElement {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('.qk-preset-picker__surface button'))
      .find(element => element.textContent?.trim() === text)!;
  }
  /** Opens from the original trigger and waits for the real selection widget. */
  async function open(): Promise<void> {
    trigger.click();
    await vi.waitFor(() => expect(document.querySelector('.qk-preset-picker__options [role="listbox"]')).not.toBeNull());
  }
  return { props, api, host, trigger, update, commit, error, cancel, openChange, option, button, open };
}

for (const presentation of ["desktop", "bottom"] as const) {
  it(`keeps ${presentation} previews and draft selection separate from explicit commit`, async () => {
    const submit = vi.fn<NonNullable<QuireKitPresetPickerProps["submit"]>>();
    const fixture = await mountPicker({ presentation, defaultValue: "plain", submit });
    await fixture.open();
    expect(document.querySelector('.qk-preset-picker__header [aria-label="关闭"]')?.classList.contains('qk-button--neutral-text')).toBe(true);
    expect(fixture.button("取消").classList.contains('qk-button--neutral-text')).toBe(true);
    const gallery = document.querySelector('.qk-preset-gallery');
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(1);
    const label = document.querySelector('.qk-listbox__label')!;
    const title = document.querySelector('.qk-preset-picker__header .qk-drawer__title')!;
    expect(label.classList.contains("qk-listbox__visually-hidden")).toBe(true);
    expect(label.hasAttribute("aria-hidden")).toBe(false);
    expect(document.querySelector('[role="listbox"]')?.getAttribute("aria-labelledby")).toBe(label.id);
    expect(label.textContent).toBe("文本样式");
    expect(title.textContent).toBe("文本样式");
    expect(document.querySelectorAll('.qk-preset-picker__header .qk-drawer__title')).toHaveLength(1);
    expect(fixture.option("plain")?.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-preview="heading"]')?.textContent).toBe("Heading preview");
    const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!;
    listbox.focus();
    listbox.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await nextTick();
    expect(fixture.option("plain")?.getAttribute("aria-selected")).toBe("true");
    expect(submit).not.toHaveBeenCalled();
    fixture.option("disabled")!.click();
    expect(fixture.option("plain")?.getAttribute("aria-selected")).toBe("true");
    fixture.option("heading")!.click();
    await nextTick();
    expect(fixture.option("heading")?.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('.qk-preset-gallery')).toBe(gallery);
    expect(submit).not.toHaveBeenCalled();
    expect(fixture.update).not.toHaveBeenCalled();
    fixture.button("取消").click();
    await vi.waitFor(() => expect(document.querySelector('.qk-preset-picker__options')).toBeNull());
    await fixture.open();
    expect(fixture.option("plain")?.getAttribute("aria-selected")).toBe("true");
    fixture.option("heading")!.click();
    fixture.button("完成").click();
    await vi.waitFor(() => expect(fixture.commit).toHaveBeenCalledOnce());
    const request = submit.mock.calls[0]![0];
    expect(Object.isFrozen(request)).toBe(true);
    expect(request).toMatchObject({ value: "heading", previousValue: "plain", signal: expect.any(AbortSignal) });
    expect(fixture.commit).toHaveBeenCalledExactlyOnceWith(request);
    expect(fixture.commit.mock.calls[0]![0]).toBe(request);
    expect(fixture.update).toHaveBeenCalledExactlyOnceWith("heading");
    expect(fixture.host.querySelector("button")).toBe(fixture.trigger);
    await vi.waitFor(() => expect(document.querySelector('.qk-preset-picker__options')).toBeNull());
    await fixture.open();
    expect(fixture.option("heading")?.getAttribute("aria-selected")).toBe("true");
  });

  it(`retains ${presentation} Gallery and confirmation nodes through busy failure and retry`, async () => {
    let reject!: (error: unknown) => void;
    const submit = vi.fn<NonNullable<QuireKitPresetPickerProps["submit"]>>()
      .mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail; }))
      .mockResolvedValueOnce(undefined);
    const fixture = await mountPicker({ presentation, defaultValue: "plain", submit, errorText: "保存失败" });
    await fixture.open();
    fixture.option("heading")!.click();
    const selected = fixture.option("heading");
    const gallery = document.querySelector('.qk-preset-gallery');
    const confirm = fixture.button("完成");
    confirm.focus(); confirm.click(); confirm.click();
    await nextTick();
    expect(submit).toHaveBeenCalledOnce();
    expect(fixture.api.value!.requestClose("escape")).toBe(false);
    fixture.option("plain")!.click();
    await nextTick();
    expect(selected?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(confirm);
    reject(new Error("private server error"));
    await vi.waitFor(() => expect(fixture.error).toHaveBeenCalledOnce());
    expect(document.querySelector('.qk-preset-gallery')).toBe(gallery);
    expect(fixture.option("heading")).toBe(selected);
    expect(fixture.button("重试")).toBe(confirm);
    expect(document.querySelectorAll('[role="alert"], [role="status"]')).toHaveLength(1);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("保存失败");
    confirm.click();
    await vi.waitFor(() => expect(fixture.commit).toHaveBeenCalledOnce());
    expect(submit).toHaveBeenCalledTimes(2);
    expect(submit.mock.calls[1]![0].requestId).toBeGreaterThan(submit.mock.calls[0]![0].requestId);
    expect(fixture.update).toHaveBeenCalledExactlyOnceWith("heading");
  });
}

it("preserves controlled null over the default and invalidates a pending scalar proposal on external replacement", async () => {
  let finish!: () => void;
  let request: QuireKitPresetSubmitRequest | undefined;
  const fixture = await mountPicker({ open: false, defaultOpen: true, modelValue: null, defaultValue: "plain", submit: value => {
    request = value;
    return new Promise<void>(resolve => { finish = resolve; });
  } });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  Object.assign(fixture.props, { open: true });
  await vi.waitFor(() => expect(fixture.option("plain")).not.toBeNull());
  expect(document.querySelector('[role="option"][aria-selected="true"]')).toBeNull();
  fixture.option("heading")!.click();
  fixture.button("完成").click();
  expect(request).toMatchObject({ value: "heading", previousValue: null });
  const gallery = document.querySelector('.qk-preset-gallery');
  Object.assign(fixture.props, { modelValue: "plain" });
  await nextTick();
  expect(request!.signal.aborted).toBe(true);
  expect(fixture.option("plain")?.getAttribute("aria-selected")).toBe("true");
  Object.assign(fixture.props, { modelValue: null });
  await nextTick();
  expect(document.querySelector('[role="option"][aria-selected="true"]')).toBeNull();
  expect(document.querySelector('.qk-preset-gallery')).toBe(gallery);
  finish();
  await nextTick();
  expect(fixture.commit).not.toHaveBeenCalled();
  expect(fixture.update).not.toHaveBeenCalled();
  expect(fixture.error).not.toHaveBeenCalled();
});

it("submits null from an empty draft and keeps a controlled host authoritative after success", async () => {
  const submit = vi.fn<NonNullable<QuireKitPresetPickerProps["submit"]>>();
  const fixture = await mountPicker({ open: true, modelValue: null, defaultValue: "plain", submit });
  await vi.waitFor(() => expect(fixture.option("plain")).not.toBeNull());
  fixture.button("完成").click();
  await vi.waitFor(() => expect(fixture.commit).toHaveBeenCalledOnce());
  expect(submit.mock.calls[0]![0]).toMatchObject({ value: null, previousValue: null });
  expect(fixture.update).toHaveBeenCalledExactlyOnceWith(null);
  fixture.option("heading")!.click();
  fixture.button("完成").click();
  await vi.waitFor(() => expect(fixture.commit).toHaveBeenCalledTimes(2));
  await nextTick();
  expect(fixture.update).toHaveBeenLastCalledWith("heading");
  expect(document.querySelector('[role="option"][aria-selected="true"]')).toBeNull();
  expect(submit).toHaveBeenCalledTimes(2);
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});

it("supports explicit immediate submission without an extra confirmation control", async () => {
  const fixture = await mountPicker({ commitMode: "immediate", defaultValue: "plain" });
  await fixture.open();
  expect(fixture.button("完成")).toBeUndefined();
  fixture.option("heading")!.click();
  await vi.waitFor(() => expect(fixture.commit).toHaveBeenCalledOnce());
  expect(fixture.update).toHaveBeenCalledExactlyOnceWith("heading");
  expect(fixture.cancel).not.toHaveBeenCalled();
});

it("keeps unavailable committed metadata in an empty Gallery and honours the native disabled trigger", async () => {
  const fixture = await mountPicker({ items: [], modelValue: "remote-preset", disabled: true });
  expect(fixture.trigger.disabled).toBe(true);
  fixture.trigger.click();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  Object.assign(fixture.props, { disabled: false });
  await nextTick();
  await fixture.open();
  expect(document.querySelector('.qk-preset-picker__options')?.textContent).toContain("没有可用的样式");
  expect(document.querySelector('[role="status"]')?.textContent).toContain("原值已保留");
  fixture.button("完成").click();
  await vi.waitFor(() => expect(fixture.commit).toHaveBeenCalledOnce());
  expect(fixture.commit.mock.calls[0]![0]).toMatchObject({ value: "remote-preset", previousValue: "remote-preset" });
});

it("ends an owned session without rewriting its retained open request or accepting its old submission", async () => {
  const parentOpen = ref(false);
  let finish!: () => void;
  let request: QuireKitPresetSubmitRequest | undefined;
  const submit = vi.fn<NonNullable<QuireKitPresetPickerProps["submit"]>>().mockImplementation(value => {
    request = value;
    return new Promise<void>(resolve => { finish = resolve; });
  });
  const updateOpen = vi.fn(), commit = vi.fn(), update = vi.fn(), cancel = vi.fn(), openChange = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(DialogRoot, {
    open: parentOpen.value, lazyMount: false, unmountOnExit: false
  }, { default: () => h(DialogContent, { title: "编辑文档" }, {
    default: () => h(PresetPicker, {
      title: "文本样式", items, presentation: "desktop", open: true, modelValue: "plain", submit,
      "onUpdate:open": updateOpen, "onUpdate:modelValue": update, onCommit: commit, onCancel: cancel, onOpenChange: openChange
    }, { trigger: () => h("button", "选择样式") })
  }) }) });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  expect(document.querySelector('.qk-preset-picker__options')).toBeNull();
  expect(openChange).not.toHaveBeenCalled();
  parentOpen.value = true;
  await vi.waitFor(() => expect(document.querySelector('.qk-preset-picker__options')).not.toBeNull());
  document.querySelector<HTMLElement>('.qk-preset-picker__options [data-value="heading"]')!.click();
  Array.from(document.querySelectorAll<HTMLButtonElement>('.qk-preset-picker__surface button'))
    .find(button => button.textContent?.trim() === "完成")!.click();
  expect(request).toMatchObject({ value: "heading", previousValue: "plain" });
  parentOpen.value = false;
  await nextTick();
  expect(request!.signal.aborted).toBe(true);
  expect(updateOpen).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledWith(expect.objectContaining({ reason: "owner-hidden" }));
  finish();
  await nextTick();
  expect(commit).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
  parentOpen.value = true;
  await vi.waitFor(() => expect(openChange.mock.calls).toEqual([[true], [false], [true]]));
  await vi.waitFor(() => expect(document.querySelector('.qk-preset-picker__options [data-value="plain"]')?.getAttribute("aria-selected")).toBe("true"));
  expect(submit).toHaveBeenCalledOnce();
});
