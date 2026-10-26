// @vitest-environment happy-dom
import { createApp, h, nextTick, type VNode } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireAlert from "./alert.vue";
const han = /[\p{Script=Han}]/u;
const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a consumer tree under an active language.
 * @param locale - Active language tag.
 * @param render - Component tree inside the provider.
 * @returns Host element.
 */
function mount(locale: string, render: () => VNode): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(QuireLocaleProvider, { locale }, render) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  return host;
}

it("names the close button from the active language", async () => {
  const host = mount("en", () => h(QuireAlert, { title: "Saved", closable: true }));
  await nextTick();
  expect(host.querySelector('[aria-label="Dismiss alert"]')).not.toBeNull();
  expect(host.innerHTML).not.toMatch(han);
  const chinese = mount("zh-CN", () => h(QuireAlert, { title: "已保存", closable: true }));
  await nextTick();
  expect(chinese.querySelector('[aria-label="关闭提示"]')).not.toBeNull();
});
