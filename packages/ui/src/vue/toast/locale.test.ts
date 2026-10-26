// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import Toaster from "./toaster.vue";
import { createQuireKitToaster } from "./create-toaster";
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

it("names each notification close button from the active language", async () => {
  const toaster = createQuireKitToaster({ placement: "bottom-end" });
  mount("en", () => h(Toaster, { toaster }));
  toaster.create({ title: "Saved", type: "success", closable: true });
  await vi.waitFor(() => expect(document.querySelector('.qk-toast__close-trigger')).not.toBeNull());
  expect(document.querySelector('.qk-toast__close-trigger')!.getAttribute("aria-label")).toBe("Dismiss notification");
  expect(document.querySelector('.qk-toast')!.outerHTML).not.toMatch(han);
});
