// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import Select from "./select.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a selection surface with optional externally controlled visibility.
 * @param controlled - Whether the parent owns visibility.
 * @returns Host state, trigger and observed visibility requests.
 */
async function mountSelect(controlled: boolean) {
  const host = document.createElement("div");
  document.body.append(host);
  const state = reactive({ open: false, color: "#7257d5", layerOffset: 0 });
  const requests: Array<boolean | undefined> = [];
  const app = createApp({
    setup: () => () => h(Select, {
      label: "Language", modelValue: "zh-CN",
      items: [{ label: "中文", value: "zh-CN" }, { label: "English", value: "en" }],
      portalled: false,
      layerOffset: state.layerOffset,
      ...(controlled ? { open: state.open } : {}),
      contentProps: { lang: "zh-CN", style: { "--owner-color": state.color } },
      "onUpdate:open": (value: boolean | undefined) => { requests.push(value); }
    })
  });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return { host, state, requests, trigger: host.querySelector<HTMLButtonElement>("button")! };
}

describe("Select visibility and portal attributes", () => {
  it("raises a nested popup relative to its owning layer without changing the theme", async () => {
    const { host, state } = await mountSelect(true);
    state.open = true;
    state.layerOffset = 1;
    await nextTick();
    const positioner = host.querySelector<HTMLElement>(".qk-select__positioner")!;
    expect(positioner.style.getPropertyValue("--qk-select-layer")).toBe("calc(var(--qk-layer-overlay) + 1)");
    state.layerOffset = 2;
    await nextTick();
    expect(positioner.style.getPropertyValue("--qk-select-layer")).toBe("calc(var(--qk-layer-overlay) + 2)");
    state.layerOffset = 0;
    await nextTick();
    expect(positioner.style.getPropertyValue("--qk-select-layer")).toBe("");
  });

  it("keeps uncontrolled opening when no visibility model is supplied", async () => {
    const { trigger, requests } = await mountSelect(false);
    trigger.click();
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(requests).toEqual([true]);
  });

  it("honors parent visibility and refreshes content theme attributes", async () => {
    const { host, state, trigger, requests } = await mountSelect(true);
    trigger.click();
    await nextTick();
    expect(requests).toEqual([true]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    state.open = true;
    await nextTick();
    const content = host.querySelector<HTMLElement>(".qk-select__content")!;
    expect(content.getAttribute("lang")).toBe("zh-CN");
    expect(content.style.getPropertyValue("--owner-color")).toBe("#7257d5");
    state.color = "#425be1";
    await nextTick();
    expect(content.style.getPropertyValue("--owner-color")).toBe("#425be1");
    state.open = false;
    await nextTick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
