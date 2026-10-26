// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireNavigationMenu from "./navigation-menu.vue";
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

it("names the landmark and follows reading direction from the active language", async () => {
  const items = [{ key: "home", label: "Home", href: "#home" }];
  const host = mount("en", () => h(QuireNavigationMenu, { items, orientation: "vertical" }));
  await vi.waitFor(() => expect(host.querySelector("nav")?.getAttribute("aria-label")).toBe("Main navigation"));
  expect(host.innerHTML).not.toMatch(han);
  const rtl = mount("ar", () => h(QuireNavigationMenu, { items, orientation: "vertical", ariaLabel: "Sections" }));
  await vi.waitFor(() => expect(rtl.querySelector("ul")?.getAttribute("dir")).toBe("rtl"));
  expect(rtl.querySelector("nav")?.getAttribute("aria-label")).toBe("Sections");
});
