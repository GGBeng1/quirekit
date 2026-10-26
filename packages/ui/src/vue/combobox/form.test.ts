// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import Combobox from "./combobox.vue";
import Field from "../field/field.vue";
import type { QuireKitFieldSlotProps } from "../../components/field/types";

const cleanups: Array<() => void> = [];
const items = [{ value: "team", label: "团队空间" }, { value: "personal", label: "个人空间" }];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a real compound control within a native form fixture.
 * @param render - Public component tree under test.
 * @returns Mounted container after Vue and Ark updates.
 */
async function mount(render: () => VNode): Promise<HTMLDivElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await settle();
  return host;
}

/**
 * Waits for Vue rendering and Ark DOM effects.
 * @returns Completion after pending work.
 */
async function settle(): Promise<void> {
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 20));
  await nextTick();
}

it("submits semantic values, keeps readonly values and omits disabled controls", async () => {
  const host = await mount(() => h("form", {}, [
    h(Combobox, { items, label: "选择", name: "selected", defaultValue: "personal" }),
    h(Combobox, { items, label: "只读", name: "readonly", defaultValue: "team", readOnly: true }),
    h(Combobox, { items, label: "禁用", name: "disabled", defaultValue: "personal", disabled: true })
  ]));
  const form = host.querySelector("form")!;
  expect([...new FormData(form)]).toEqual([["selected", "personal"], ["readonly", "team"]]);
  expect(host.querySelector('input[role="combobox"]')?.hasAttribute("name")).toBe(false);
});

it("validates a committed selection instead of a nonempty search draft", async () => {
  const state = reactive<{ modelValue: string | null; inputValue: string }>({ modelValue: null, inputValue: "正在搜索" });
  const host = await mount(() => h(Combobox, { ...state, items, label: "必填", required: true }));
  const input = host.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  expect(input.value).toBe("正在搜索");
  expect(input.validity.valid).toBe(false);
  state.modelValue = "team";
  await settle();
  expect(input.validity.valid).toBe(true);
});

it("preserves caller-owned selection and draft through external native form reset", async () => {
  const state = reactive({ modelValue: "team", inputValue: "团队空间" });
  const host = await mount(() => h("div", {}, [
    h("form", { id: "external-combobox-form" }),
    h(Combobox, { ...state, items, label: "外部字段", name: "space", form: "external-combobox-form", defaultValue: "team" })
  ]));
  state.modelValue = "personal";
  state.inputValue = "未提交搜索";
  await settle();
  const form = host.querySelector("form")!;
  form.reset();
  await settle();
  expect(host.querySelector<HTMLInputElement>('input[role="combobox"]')?.value).toBe("未提交搜索");
  expect(new FormData(form).get("space")).toBe("personal");
});

it("accepts a committed required value while its controlled search draft is empty", async () => {
  const host = await mount(() => h(Field, { label: "已选必填", required: true }, {
    default: (field: QuireKitFieldSlotProps) => h(Combobox, { ...field.controlProps, items, label: "已选必填", modelValue: "team", inputValue: "" })
  }));
  const input = host.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  expect(input.value).toBe("");
  expect(input.getAttribute("aria-required")).toBe("true");
  expect(input.validity.valid).toBe(true);
});

it("handles late-mounted and replaced associated forms and respects cancelled reset", async () => {
  const state = reactive({ visible: false, key: 0, cancel: false });
  const changed = vi.fn();
  const host = await mount(() => h("div", {}, [
    h(Combobox, { items, label: "后挂载表单", name: "space", form: "late-form", defaultValue: "team", "onUpdate:inputValue": changed }),
    state.visible ? h("form", { id: "late-form", key: state.key, onReset: (event: Event) => { if (state.cancel) event.preventDefault(); } }) : null
  ]));
  state.visible = true;
  await settle();
  host.querySelector("form")!.reset();
  await settle();
  expect(changed).toHaveBeenCalledWith("团队空间");
  changed.mockClear();
  state.key += 1;
  await settle();
  host.querySelector("form")!.reset();
  await settle();
  expect(changed).toHaveBeenCalledWith("团队空间");
  changed.mockClear();
  state.cancel = true;
  host.querySelector("form")!.reset();
  await settle();
  expect(changed).not.toHaveBeenCalled();
});
