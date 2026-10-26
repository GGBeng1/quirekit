// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireTimeline from "./timeline.vue";
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

it("takes the list name, empty text and status labels from the active language", async () => {
  const host = mount("en", () => h(QuireTimeline, { items: [{ key: "a", title: "Deployed", status: "success" }] }));
  await vi.waitFor(() => expect(host.querySelector("ol")?.getAttribute("aria-label")).toBe("Event history"));
  expect(host.textContent).toContain("Success");
  const empty = mount("en", () => h(QuireTimeline, { items: [] }));
  await vi.waitFor(() => expect(empty.textContent).toContain("No records"));
  expect(`${host.innerHTML}${empty.innerHTML}`).not.toMatch(han);
});
