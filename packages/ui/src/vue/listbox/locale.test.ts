// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import type { VNode } from "vue";
import QuireListbox from "./listbox.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

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

it("shows the empty text of the active language", async () => {
  const chinese = mount(() => h(QuireListbox, { label: "Files", items: [] }));
  const english = mount(() => h(QuireLocaleProvider, { locale: "en" }, () => h(QuireListbox, { label: "Files", items: [] })));
  await nextTick();
  expect(chinese.querySelector(".qk-listbox__empty")?.textContent).toBe("暂无选项");
  expect(english.querySelector(".qk-listbox__empty")?.textContent).toBe("No options");
  expect(english.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});
