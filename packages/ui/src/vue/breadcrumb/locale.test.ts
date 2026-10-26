// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireBreadcrumb from "./breadcrumb.vue";
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

it("takes the landmark and overflow names from the active language", async () => {
  const items = ["Home", "Docs", "Guide", "Editor", "Tables"].map(label => ({ key: label, label, href: `#${label}` }));
  const host = mount("en", () => h(QuireBreadcrumb, { items, maxItems: 3 }));
  await vi.waitFor(() => expect(host.querySelector("nav")?.getAttribute("aria-label")).toBe("Breadcrumb"));
  expect(host.querySelector('[aria-label="More levels"]')).not.toBeNull();
  expect(host.innerHTML).not.toMatch(han);
});
