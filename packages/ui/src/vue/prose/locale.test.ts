// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireProseContainer from "./container/container.vue";
import QuireProsePreview from "./preview/preview.vue";
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

it("takes disclosure and preview tab text from the active language", async () => {
  const host = mount("en", () => h("div", [
    h(QuireProseContainer, { title: "Notes", collapsible: true }, () => "Body"),
    h(QuireProsePreview, {}, { default: () => "Preview body", source: () => "Source body" })
  ]));
  await vi.waitFor(() => expect(host.querySelector('[aria-label="Collapse Notes"]')).not.toBeNull());
  expect(host.textContent).toContain("Preview");
  expect(host.textContent).toContain("Source");
  expect(host.querySelector('[aria-label="Example view"]')).not.toBeNull();
  expect(host.innerHTML).not.toMatch(han);
});
