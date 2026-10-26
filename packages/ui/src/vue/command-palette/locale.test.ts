// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireCommandPalette from "./command-palette.vue";
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

it("takes hints, states and actions from the active language", async () => {
  const host = mount("en", () => h(QuireCommandPalette, { label: "Commands", groups: [], defaultSearch: "zz", busy: true }));
  await vi.waitFor(() => expect(host.textContent).toContain("No matching commands"));
  expect(host.querySelector("input")!.getAttribute("placeholder")).toBe("Search commands…");
  expect(host.textContent).toContain("Try another keyword, or clear the search to see all commands.");
  expect(host.textContent).toContain("Running…");
  expect(host.querySelector('[aria-label="Clear search"]')).not.toBeNull();
  expect(host.innerHTML).not.toMatch(han);
  const custom = mount("en", () => h(QuireCommandPalette, { label: "Files", groups: [], placeholder: "Find a file", loading: true }));
  await vi.waitFor(() => expect(custom.textContent).toContain("Searching…"));
  expect(custom.querySelector("input")!.getAttribute("placeholder")).toBe("Find a file");
});
