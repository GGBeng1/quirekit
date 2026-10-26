// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import type { VNode } from "vue";
import QuireCascader from "./cascader.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const nodes = [{ id: "east", label: "East", children: [{ id: "north", label: "North" }] }];
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

it("names the field, search and levels in the active language", async () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: "en" }, () =>
    h(QuireCascader, { label: "Region", nodes, defaultOpen: true, portalled: false })));
  await nextTick(); await nextTick();
  expect(host.querySelector('[aria-label="Region: Select"]')).not.toBeNull();
  const search = host.querySelector<HTMLInputElement>('input[aria-label="Search Region"]')!;
  expect(search.placeholder).toBe("Search names or full paths");
  expect(host.textContent).toContain("Region level 1");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps the Chinese defaults without a provider", async () => {
  const host = mount(() => h(QuireCascader, { label: "地区", nodes, defaultValue: ["east", "north"], portalled: false }));
  await nextTick();
  expect(host.querySelector('[aria-label="地区: East / North"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="清空地区"]')).not.toBeNull();
});
