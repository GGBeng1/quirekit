// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import type { VNode } from "vue";
import QuireSelect from "./select.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const items = [{ label: "One", value: "1" }];
const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });

/** Mounts a render function in a disposable host. @param render - Vue render function. @returns Host element. */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  return host;
}

it("falls back to the active language placeholder and keeps a host placeholder", async () => {
  const chinese = mount(() => h(QuireSelect, { label: "Level", items, portalled: false }));
  const english = mount(() => h(QuireLocaleProvider, { locale: "en" }, () => h(QuireSelect, { label: "Level", items, portalled: false })));
  const custom = mount(() => h(QuireLocaleProvider, { locale: "en" }, () => h(QuireSelect, { label: "Level", items, placeholder: "Pick a level", portalled: false })));
  await nextTick();
  expect(chinese.querySelector(".qk-select__value")?.textContent).toBe("请选择");
  expect(english.querySelector(".qk-select__value")?.textContent).toBe("Select");
  expect(custom.querySelector(".qk-select__value")?.textContent).toBe("Pick a level");
  expect(english.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});
