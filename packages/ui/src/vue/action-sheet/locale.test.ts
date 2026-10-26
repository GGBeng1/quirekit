// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireActionSheet from "./action-sheet.vue";
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

it("takes cancel, empty and busy text from the active language", async () => {
  mount("en", () => h(QuireActionSheet, { title: "File", actions: [], open: true, busy: true }));
  await vi.waitFor(() => expect(document.querySelector(".qk-action-sheet__cancel")).not.toBeNull());
  const surface = document.querySelector(".qk-drawer__content")!;
  expect(surface.textContent).toContain("No actions available");
  expect(surface.textContent).toContain("Working…");
  expect(surface.querySelector(".qk-action-sheet__cancel")!.textContent).toBe("Cancel");
  expect(surface.outerHTML).not.toMatch(han);
});
