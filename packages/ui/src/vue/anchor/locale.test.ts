// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireAnchor from "./anchor.vue";
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

it("names the landmark from the active language unless the host names it", async () => {
  const host = mount("en", () => h(QuireAnchor, { items: [{ id: "intro", label: "Intro" }] }));
  await vi.waitFor(() => expect(host.querySelector("nav")?.getAttribute("aria-label")).toBe("On this page"));
  expect(host.innerHTML).not.toMatch(han);
  const named = mount("en", () => h(QuireAnchor, { items: [{ id: "intro", label: "Intro" }], title: "Contents" }));
  await vi.waitFor(() => expect(named.querySelector("nav")?.getAttribute("aria-label")).toBe("Contents"));
});
