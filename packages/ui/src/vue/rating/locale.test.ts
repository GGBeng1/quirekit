// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireRating from "./rating.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts Rating, optionally inside a language provider.
 * @param props - Rating props.
 * @param locale - Provider language, or undefined for the built-in default.
 * @returns Mounted host element.
 */
async function mountRating(props: Record<string, unknown>, locale?: string): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const rating = () => h(QuireRating, props);
  const app = createApp({ render: () => locale ? h(QuireLocaleProvider, { locale }, rating) : rating() });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host;
}

it("renders score text, star names and the clear action in the provider language", async () => {
  const host = await mountRating({ label: "Score", clearable: true, modelValue: 0 }, "en");
  expect(host.textContent).toContain("Not rated");
  expect(host.textContent).toContain("Clear rating");
  expect(host.querySelector('[role="radio"]')?.getAttribute("aria-label")).toBe("1 star of 5");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps Chinese score text without a provider", async () => {
  const host = await mountRating({ label: "评分", modelValue: 3 });
  expect(host.textContent).toContain("3 / 5 分");
});
