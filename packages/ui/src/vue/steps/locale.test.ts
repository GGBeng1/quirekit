// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireSteps from "./steps.vue";
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

it("takes empty, completed and step state text from the active language", async () => {
  const empty = mount("en", () => h(QuireSteps, { label: "Setup", items: [] }));
  await vi.waitFor(() => expect(empty.textContent).toContain("No steps"));
  const items = [{ key: "a", title: "Account" }, { key: "b", title: "Profile" }];
  const done = mount("en", () => h(QuireSteps, { label: "Setup", items, modelValue: 2 }));
  await vi.waitFor(() => expect(done.textContent).toContain("All steps completed"));
  expect(done.textContent).toContain("Account · Completed");
  expect(`${empty.innerHTML}${done.innerHTML}`).not.toMatch(han);
});
