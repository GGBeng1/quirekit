// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireInputNumber from "./input-number.vue";
import QuireInputNumberUnit from "../input-number-unit/input-number-unit.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a render function, optionally inside a language provider.
 * @param render - Component tree under test.
 * @param locale - Provider language, or undefined for the built-in default.
 * @returns Mounted host element.
 */
async function mount(render: () => unknown, locale?: string): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => locale ? h(QuireLocaleProvider, { locale }, render) : render() });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host;
}

/** @param host - Mounted host. @returns Accessible names of the step buttons. */
function stepLabels(host: HTMLElement): string[] {
  return [...host.querySelectorAll("button")].map(button => button.getAttribute("aria-label") ?? "");
}

it("names step buttons and formats numbers in the provider language", async () => {
  const host = await mount(() => h(QuireInputNumber, { label: "Width", modelValue: "1234.5", formatOptions: { maximumFractionDigits: 1 } }), "en");
  expect(stepLabels(host)).toEqual(["Increase Width", "Decrease Width"]);
  expect(host.querySelector("input")?.value).toBe("1,234.5");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps Chinese step names without a provider", async () => {
  const host = await mount(() => h(QuireInputNumber, { label: "宽度" }));
  expect(stepLabels(host)).toEqual(["增加宽度", "减少宽度"]);
});

it("passes the provider language through InputNumberUnit", async () => {
  const host = await mount(() => h(QuireInputNumberUnit, {
    label: "Indent", unitLabel: "Indent unit", modelValue: 2, unit: "cm", units: [{ value: "cm", label: "cm" }]
  }), "en");
  expect(stepLabels(host)).toContain("Increase Indent");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});
