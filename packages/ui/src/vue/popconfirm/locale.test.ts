// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuirePopconfirm from "./popconfirm.vue";
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

it("uses the language pack for cancel and the default confirm while keeping host action names", async () => {
  mount("en", () => h(QuirePopconfirm, { title: "Archive project?", defaultOpen: true }, () => h("button", "Archive")));
  await vi.waitFor(() => expect(document.querySelector(".qk-popconfirm")).not.toBeNull());
  const surface = document.querySelector(".qk-popconfirm")!;
  expect([...surface.querySelectorAll("button")].map(button => button.textContent?.trim())).toEqual(["Cancel", "Confirm"]);
  expect(surface.outerHTML).not.toMatch(han);
  cleanups.splice(0).forEach(cleanup => cleanup());
  mount("en", () => h(QuirePopconfirm, { title: "Delete table?", confirmLabel: "Delete table", defaultOpen: true }, () => h("button", "Delete")));
  await vi.waitFor(() => expect(document.querySelector(".qk-popconfirm")).not.toBeNull());
  expect(document.querySelector(".qk-popconfirm")!.textContent).toContain("Delete table");
});
