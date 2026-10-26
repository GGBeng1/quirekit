// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuirePopoverRoot from "./root.vue";
import QuirePopoverContent from "./content.vue";
import QuirePopoverCloseTrigger from "./close-trigger.vue";
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

it("names the close trigger from the active language unless the host names the action", async () => {
  mount("en", () => h(QuirePopoverRoot, { defaultOpen: true }, () => h(QuirePopoverContent, {}, () => [
    h(QuirePopoverCloseTrigger, { class: "generic" }), h(QuirePopoverCloseTrigger, { class: "named", label: "Close level list" })
  ])));
  await vi.waitFor(() => expect(document.querySelector(".generic")).not.toBeNull());
  expect(document.querySelector(".generic")!.getAttribute("aria-label")).toBe("Close popover");
  expect(document.querySelector(".named")!.getAttribute("aria-label")).toBe("Close level list");
  expect(document.querySelector(".generic")!.closest("[data-part='content']")!.outerHTML).not.toMatch(han);
});
