// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import type { Component } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import Checkbox from "./checkbox.vue";
import Switch from "../switch/switch.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a toggle in a native form to observe submission and focus.
 * @param component - Public checkbox or switch adapter.
 * @returns The live form and reactive host state.
 */
async function mountToggle(component: Component) {
  const state = reactive({ checked: true, readOnly: true, disabled: false });
  const form = document.createElement("form");
  document.body.append(form);
  const app = createApp(defineComponent({
    setup: () => () => h(component, {
      label: "Automatic save", name: "autosave", value: "enabled", ...state,
      "onUpdate:checked": (value: boolean) => { state.checked = value; }
    })
  }));
  app.mount(form);
  cleanups.push(() => { app.unmount(); form.remove(); });
  await nextTick();
  return { form, state };
}

describe.each([["Checkbox", Checkbox], ["Switch", Switch]] as const)("%s native form state", (_, component) => {
  it("preserves readonly focus and submission while rejecting activation", async () => {
    const { form, state } = await mountToggle(component);
    const input = form.querySelector<HTMLInputElement>("input")!;
    input.focus();
    expect(document.activeElement).toBe(input);
    expect(input.disabled).toBe(false);
    input.click();
    await nextTick();
    expect(input.checked).toBe(true);
    expect(state.checked).toBe(true);
    expect(new FormData(form).get("autosave")).toBe("enabled");
  });

  it("excludes disabled values and restores the same input for editing", async () => {
    const { form, state } = await mountToggle(component);
    const input = form.querySelector<HTMLInputElement>("input")!;
    state.disabled = true;
    await nextTick();
    expect(input.disabled).toBe(true);
    expect(new FormData(form).has("autosave")).toBe(false);
    state.disabled = false;
    state.readOnly = false;
    await nextTick();
    expect(form.querySelector("input")).toBe(input);
    input.click();
    await nextTick();
    expect(state.checked).toBe(false);
    expect(new FormData(form).has("autosave")).toBe(false);
  });
});
