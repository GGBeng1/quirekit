// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import type { VNode } from "vue";
import QuireCombobox from "./combobox.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const items = [{ label: "Alpha", value: "a" }];
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

it("reads the hint, action names and validation from the active language", async () => {
  const host = mount(() => h(QuireLocaleProvider, { locale: "en" }, () =>
    h("form", [h(QuireCombobox, { label: "Project", items, defaultValue: "a", required: true, portalled: false })])));
  await nextTick(); await nextTick();
  const input = host.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  expect(input.placeholder).toBe("Search or select");
  expect(host.querySelector('[aria-label="Show options"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Clear selection"]')).not.toBeNull();
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
  host.querySelector<HTMLButtonElement>('[aria-label="Clear selection"]')!.click();
  await nextTick(); await nextTick();
  expect(input.validationMessage).toBe("Select an item.");
});

it("keeps the Chinese defaults without a provider", async () => {
  const host = mount(() => h(QuireCombobox, { label: "项目", items, portalled: false }));
  await nextTick();
  expect(host.querySelector<HTMLInputElement>('input[role="combobox"]')!.placeholder).toBe("搜索或选择");
  expect(host.querySelector('[aria-label="展开选项"]')).not.toBeNull();
});
