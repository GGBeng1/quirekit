// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitTaskPanelProps } from "../../components/task-panel";
import TaskPanel from "./root.vue";
const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).reverse().forEach(cleanup => cleanup()); vi.restoreAllMocks(); });
/** @param presentation - Explicit physical shell. @returns Real public SFC and its persistent draft. */
async function mount(presentation: "desktop" | "bottom") {
  const props = reactive({ title: "插入内容", presentation, busy: false, canGoBack: false, onCloseRequest: undefined as QuireKitTaskPanelProps["onCloseRequest"] });
  const api = ref<InstanceType<typeof TaskPanel>>(), cancel = vi.fn(), back = vi.fn(), content = vi.fn();
  const host = document.createElement("div"); document.body.append(host);
  const app = createApp({ render: () => h(TaskPanel, { ...props, ref: api, onCancel: cancel, onBack: back, onContentElementChange: content }, { trigger: () => h("button", "打开任务"), default: () => h("input", { "aria-label": "参数草稿" }) }) });
  app.mount(host); cleanups.push(() => { app.unmount(); host.remove(); }); await nextTick();
  const trigger = host.querySelector<HTMLButtonElement>("button")!; trigger.click();
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
  return { props, api, trigger, cancel, back, content, draft: document.querySelector<HTMLInputElement>('[aria-label="参数草稿"]')! };
}
for (const presentation of ["desktop", "bottom"] as const) {
  it(`keeps one ${presentation} surface and draft through page changes, guarding busy closes`, async () => {
    const fixture = await mount(presentation); fixture.draft.value = "retained";
    fixture.props.title = "参数页面"; fixture.props.canGoBack = true; fixture.props.busy = true; await nextTick();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(fixture.content).toHaveBeenCalledExactlyOnceWith(document.querySelector('[role="dialog"]'));
    expect(document.querySelector('[aria-label="参数草稿"]')).toBe(fixture.draft);
    expect(fixture.draft.value).toBe("retained"); expect(fixture.api.value!.requestClose()).toBe(false);
    fixture.trigger.click(); await nextTick(); expect(fixture.trigger.getAttribute("aria-expanded")).toBe("true");
    fixture.props.busy = false; const guard = vi.fn(); fixture.props.onCloseRequest = guard; await nextTick();
    expect(fixture.api.value!.requestClose("action")).toBe(true);
    await vi.waitFor(() => expect(fixture.trigger.getAttribute("aria-expanded")).toBe("false"));
    expect(guard).toHaveBeenCalledOnce(); expect(fixture.cancel).not.toHaveBeenCalled();
  });
  it(`reports ${presentation} cancellation once without applying drafts`, async () => {
    const fixture = await mount(presentation); fixture.api.value!.requestClose("escape");
    await vi.waitFor(() => expect(fixture.cancel).toHaveBeenCalledOnce());
    expect(fixture.cancel.mock.calls[0]![0]).toMatchObject({ reason: "escape" });
  });
}
