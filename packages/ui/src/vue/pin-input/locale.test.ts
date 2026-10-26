// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuirePinInput from "./pin-input.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts PinInput, optionally inside a language provider.
 * @param locale - Provider language, or undefined for the built-in default.
 * @returns Mounted host element.
 */
async function mountPin(locale?: string): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const pin = () => h(QuirePinInput, { length: 4 });
  const app = createApp({ render: () => locale ? h(QuireLocaleProvider, { locale }, pin) : pin() });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host;
}

it("names the group and cells in the provider language", async () => {
  const host = await mountPin("en");
  expect(host.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Verification code");
  expect(host.querySelector('[data-part="input"]')?.getAttribute("aria-label")).toBe("Verification code, character 1 of 4");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps Chinese cell names without a provider", async () => {
  const host = await mountPin();
  expect(host.querySelector('[data-part="input"]')?.getAttribute("aria-label")).toBe("验证码，第 1 位，共 4 位");
});
