// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, defineComponent, h } from "vue";
import type { VNode } from "vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import { useQuireKitEditorIconCatalog } from "./catalog";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });

/** @param render - Root render function. @returns Mounted host element. */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  return host;
}

const Probe = defineComponent({
  setup() {
    const catalog = useQuireKitEditorIconCatalog();
    return () => h("ul", catalog.groups.value.slice(0, 2).map(group =>
      h("li", [group.label, ": ", group.icons.slice(0, 2).map(icon => icon.label).join(", ")])));
  }
});

it("labels the icon catalog in Chinese without a provider", () => {
  const host = mount(() => h(Probe));
  expect(host.textContent).toContain("折叠与翻页: 向左, 向右");
});

it("labels the icon catalog in the provider language", () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: "en" }, () => h(Probe)));
  expect(host.textContent).toContain("Chevrons and paging: Left, Right");
  expect(host.textContent).toContain("Arrows and movement: Left arrow, Right arrow");
  expect(host.textContent).not.toMatch(/\p{Script=Han}/u);
});
