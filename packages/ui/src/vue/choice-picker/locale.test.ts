// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import Picker from "./root.vue";
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

it("renders every task string in the active language", async () => {
  mount("en", () => h(Picker, {
    title: "Members", selectionMode: "multiple", searchable: true, presentation: "desktop", defaultOpen: true,
    items: [{ value: "a", label: "Alice" }]
  }, { trigger: () => h("button", "Members") }));
  await vi.waitFor(() => expect(document.querySelector('[id^="selection-task-"][id$="-content"]')).not.toBeNull());
  const surface = document.querySelector<HTMLElement>('[id^="selection-task-"][id$="-content"]')!;
  expect(surface.textContent).toContain("Search options");
  expect(surface.textContent).toContain("0 selected");
  expect(surface.textContent).toContain("Cancel");
  expect(surface.textContent).toContain("Done");
  expect(surface.querySelector('[aria-label="Close"]')).not.toBeNull();
  expect(surface.outerHTML).not.toMatch(han);
});
