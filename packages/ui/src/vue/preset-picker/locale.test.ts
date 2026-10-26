// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import PresetPicker from "./root.vue";
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
  mount("en", () => h(PresetPicker, { title: "Styles", items: [], presentation: "desktop", defaultOpen: true }, { trigger: () => h("button", "Styles") }));
  await vi.waitFor(() => expect(document.querySelector(".qk-preset-picker__surface")).not.toBeNull());
  const surface = document.querySelector<HTMLElement>(".qk-preset-picker__surface")!;
  expect(surface.textContent).toContain("No presets available");
  expect(surface.textContent).toContain("No preset selected");
  expect(surface.textContent).toContain("Cancel");
  expect(surface.textContent).toContain("Done");
  expect(surface.querySelector('[aria-label="Close"]')).not.toBeNull();
  expect(surface.outerHTML).not.toMatch(han);
});
