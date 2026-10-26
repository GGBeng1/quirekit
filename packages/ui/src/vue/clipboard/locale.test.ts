// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireClipboard from "./clipboard.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts Clipboard, optionally inside a language provider.
 * @param locale - Provider language, or undefined for the built-in default.
 * @returns Mounted host element.
 */
async function mountClipboard(locale?: string): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const clipboard = () => h(QuireClipboard, { value: "QK-1", label: locale ? "Code" : "编号" });
  const app = createApp({ render: () => locale ? h(QuireLocaleProvider, { locale }, clipboard) : clipboard() });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host;
}

it("renders copy actions in the provider language", async () => {
  const host = await mountClipboard("en");
  expect(host.querySelector("button")?.getAttribute("aria-label")).toBe("Copy Code");
  expect(host.textContent).toContain("Copied");
  expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps Chinese without a provider", async () => {
  const host = await mountClipboard();
  expect(host.querySelector("button")?.getAttribute("aria-label")).toBe("复制编号");
});
