// @vitest-environment happy-dom
import { createApp, h, type VNode } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireBadge from "./badge.vue";
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

it("describes a dot from the active language", async () => {
  const host = mount("en", () => h(QuireBadge, { dot: true }));
  await vi.waitFor(() => expect(host.textContent).toContain("New activity"));
  expect(host.innerHTML).not.toMatch(han);
  const chinese = mount("zh-CN", () => h(QuireBadge, { dot: true }));
  await vi.waitFor(() => expect(chinese.textContent).toContain("有新消息"));
});
