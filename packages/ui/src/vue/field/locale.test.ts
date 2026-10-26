// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireField from "./field.vue";
import QuireFieldset from "../fieldset/fieldset.vue";
import QuireInspector from "../inspector/index.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a render function, optionally inside a language provider.
 * @param render - Component tree under test.
 * @param locale - Provider language, or undefined for the built-in default.
 * @returns Mounted host element.
 */
async function mount(render: () => unknown, locale?: string): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => locale ? h(QuireLocaleProvider, { locale }, render) : render() });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host;
}

it.each([
  ["Field invalid", () => h(QuireField, { label: "Name", invalid: true }, () => h("input")), "Check this field", "请检查此字段"],
  ["Field mixed", () => h(QuireField, { label: "Name", mixed: true }, () => h("input")), "Mixed values", "多个值"],
  ["Field busy", () => h(QuireField, { label: "Name", busy: true }, () => h("input")), "Updating…", "正在更新…"],
  ["Fieldset invalid", () => h(QuireFieldset, { legend: "Page", invalid: true }, () => h("input")), "Check these settings", "请检查这一组设置"],
  ["Inspector mixed", () => h(QuireInspector, { title: "Shape", mixed: true }, () => "Body"), "Selected objects have different values", "多个对象的值不同"],
  ["Inspector busy", () => h(QuireInspector, { title: "Shape", busy: true }, () => "Body"), "Updating…", "正在更新…"]
])("renders %s feedback in the provider language", async (_name, render, english, chinese) => {
  const host = await mount(render, "en");
  expect(host.textContent).toContain(english);
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
  expect((await mount(render)).textContent).toContain(chinese);
});

it("keeps host-written feedback over the language pack", async () => {
  const host = await mount(() => h(QuireField, { label: "Name", mixed: true, mixedText: "3 objects differ" }, () => h("input")), "zh-CN");
  expect(host.textContent).toContain("3 objects differ");
});
