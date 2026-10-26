// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, type Component } from "vue";
import { afterEach, expect, it } from "vitest";
import Field from "./field.vue";
import Input from "../input/input.vue";
import Textarea from "../textarea/textarea.vue";
import InputNumber from "../input-number/input-number.vue";
import LocaleProvider from "../locale-provider/locale-provider.vue";
import type { QuireKitFieldSlotProps } from "../../components/field";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/** @param render - Live adapter tree. @returns Mounted host after Vue settles. */
async function mount(render: () => unknown): Promise<HTMLElement> {
  const host = document.createElement("div"); document.body.append(host);
  const app = createApp({ render }); app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick(); return host;
}

it.each([["Input", Input], ["Textarea", Textarea], ["InputNumber", InputNumber]] as const)("%s inherits live field guidance without replacing the input or its value", async (_, component: Component) => {
  const state = reactive({ label: "标题", locale: "zh-CN", value: "草稿", placeholder: undefined as string | undefined });
  const host = await mount(() => h(LocaleProvider, { locale: state.locale }, () => h(Field, { label: state.label }, {
    default: ({ controlProps }: QuireKitFieldSlotProps) => h(component, {
      ...controlProps, ...(component === InputNumber ? { label: state.label, modelValue: "12" } : { modelValue: state.value }), placeholder: state.placeholder
    })
  })));
  const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>("input,textarea")!;
  expect(input.placeholder).toBe("请输入标题");
  expect((host.querySelector(".qk-field") as HTMLElement).style.width).toBe("100%");
  expect((host.querySelector(".qk-input,.qk-textarea,.qk-input-number") as HTMLElement).style.width).toBe("100%");
  input.focus(); state.locale = "en"; state.label = "Title"; await nextTick();
  expect(input.placeholder).toBe("Enter Title");
  expect(host.querySelector("input,textarea")).toBe(input); expect(document.activeElement).toBe(input);
  expect(input.value).toBe(component === InputNumber ? "12" : "草稿");
  state.placeholder = "留空使用默认标题"; await nextTick(); expect(input.placeholder).toBe("留空使用默认标题");
  state.placeholder = ""; await nextTick(); expect(input.placeholder).toBe("");
});

it("uses type-specific defaults and the nearest label, with explicit ARIA names taking precedence", async () => {
  const host = await mount(() => h("div", [
    h(Input, { type: "search" }), h(Input, { type: "email" }), h(Input, { type: "password" }),
    h(Input, { type: "url" }), h(Input, { type: "tel" }), h(Textarea),
    h(Field, { label: "外层", width: "180px" }, () => [
      h(Input, { "aria-label": "具体对象", width: "120px" }),
      h(Field, { label: "内层" }, () => h(Input))
    ])
  ]));
  expect([...host.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea")].map(input => input.placeholder))
    .toEqual(["搜索内容", "请输入邮箱地址", "请输入密码", "请输入网址", "请输入电话号码", "请输入内容", "请输入具体对象", "请输入内层"]);
  expect((host.querySelector(".qk-field") as HTMLElement).style.width).toBe("180px");
  expect((host.querySelector('[aria-label="具体对象"]')!.closest(".qk-input") as HTMLElement).style.width).toBe("120px");
});
