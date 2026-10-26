// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import DrawerRoot from "./root.vue";
import DrawerContent from "./content.vue";
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

it("names the close button from the active language", async () => {
  const open = { open: true, modal: false, trapFocus: false, preventScroll: false };
  mount("en", () => h(DrawerRoot, open, () => h(DrawerContent, { title: "Details", portalled: false }, () => "Body")));
  await vi.waitFor(() => expect(document.querySelector('.qk-drawer__close-trigger')).not.toBeNull());
  expect(document.querySelector('.qk-drawer__close-trigger')!.getAttribute("aria-label")).toBe("Close");
  expect(document.querySelector('.qk-drawer__content')!.outerHTML).not.toMatch(han);
});
