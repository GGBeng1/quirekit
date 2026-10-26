// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireSplitter from "./splitter.vue";
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

it("names each resize handle from the active language", async () => {
  const host = mount("en", () => h(QuireSplitter, { label: "Workspace", panels: [{ id: "doc", label: "Document" }, { id: "inspector", label: "Inspector" }] }));
  await vi.waitFor(() => expect(host.querySelector('[aria-label="Resize Document and Inspector"]')).not.toBeNull());
  expect(host.innerHTML).not.toMatch(han);
});
