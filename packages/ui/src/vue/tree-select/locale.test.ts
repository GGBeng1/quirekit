// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import type { VNode } from "vue";
import QuireTreeSelect from "./tree-select.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const nodes = [{ id: "docs", label: "Docs", children: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }] }];
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

it("joins selections and names actions in the active language", async () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: "en" }, () =>
    h(QuireTreeSelect, { label: "Files", nodes, selectionMode: "multiple", defaultValue: ["a", "b"], portalled: false })));
  await nextTick();
  expect(host.querySelector(".qk-hierarchy-picker__value")?.textContent).toBe("Alpha, Beta");
  expect(host.querySelector('[aria-label="Clear Files"]')).not.toBeNull();
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("shows the empty hierarchy text of the active language", async () => {
  const english = mount(() => h(QuireLocaleProvider, { locale: "en" }, () =>
    h(QuireTreeSelect, { label: "Files", nodes: [], defaultOpen: true, portalled: false })));
  const chinese = mount(() => h(QuireTreeSelect, { label: "文件", nodes: [], defaultOpen: true, portalled: false }));
  await nextTick(); await nextTick();
  expect(english.querySelector(".qk-hierarchy-picker__empty")?.textContent).toBe("No options");
  expect(english.querySelector(".qk-hierarchy-picker__value")?.textContent).toBe("Select");
  expect(chinese.querySelector(".qk-hierarchy-picker__empty")?.textContent).toBe("暂无选项");
});
