// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import type { Component } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import CheckboxGroup from "./checkbox-group.vue";
import ToggleGroup from "../toggle-group/toggle-group.vue";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach(dispose => dispose()));
const items = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "locked", label: "Locked", disabled: true }];
/**
 * Mounts either public array control inside a real native form.
 * @param component - Public group component.
 * @param extra - Mode-specific props.
 * @returns Reactive host selection and rendered form.
 */
async function mountGroup(component: Component, extra: Record<string, unknown> = {}) {
  const form = document.createElement("form");
  document.body.append(form);
  const state = reactive({ modelValue: ["a", "locked"], readOnly: false, disabled: false });
  const app = createApp(defineComponent({ setup: () => () => h(component, { ...extra, ...state, items, label: "Options", name: "options", "onUpdate:modelValue": (value: string[]) => { state.modelValue = value; } }) }));
  app.mount(form);
  cleanup.push(() => { app.unmount(); form.remove(); });
  await nextTick();
  return { form, state };
}

describe.each([["CheckboxGroup", CheckboxGroup, {}], ["ToggleGroup", ToggleGroup, { multiple: true }]] as const)("%s model and native form", (_name, component, props) => {
  it("submits repeated enabled values, preserves readonly data, and excludes disabled values", async () => {
    const { form, state } = await mountGroup(component, props);
    expect(new FormData(form).getAll("options")).toEqual(["a"]);
    const control = form.querySelector<HTMLElement>('input[value="b"][type="checkbox"], button[aria-label="Beta"]')!;
    control.click();
    await nextTick();
    expect(state.modelValue).toEqual(["a", "locked", "b"]);
    expect(new FormData(form).getAll("options")).toEqual(["a", "b"]);
    state.readOnly = true;
    await nextTick();
    control.click();
    await nextTick();
    expect(state.modelValue).toEqual(["a", "locked", "b"]);
    expect(new FormData(form).getAll("options")).toEqual(["a", "b"]);
    state.disabled = true;
    await nextTick();
    expect(new FormData(form).getAll("options")).toEqual([]);
  });
});

describe.each([["CheckboxGroup", CheckboxGroup, {}], ["ToggleGroup", ToggleGroup, { multiple: true }]] as const)("%s uncontrolled reset", (_name, component, props) => {
  it("restores default values after a native reset without requiring host state", async () => {
    const form = document.createElement("form");
    document.body.append(form);
    const app = createApp(defineComponent({ setup: () => () => h(component, { ...props, defaultValue: ["a"], items, label: "Options", name: "options" }) }));
    app.mount(form);
    cleanup.push(() => { app.unmount(); form.remove(); });
    await nextTick();
    form.querySelector<HTMLElement>('input[value="b"][type="checkbox"], button[aria-label="Beta"]')!.click();
    await nextTick();
    expect(new FormData(form).getAll("options")).toEqual(["a", "b"]);
    form.reset();
    await Promise.resolve();
    await nextTick();
    expect(new FormData(form).getAll("options")).toEqual(["a"]);
  });
});

it("keeps ordinary Tab stops when ToggleGroup roving focus is disabled", async () => {
  const { form } = await mountGroup(ToggleGroup, { multiple: true, rovingFocus: false });
  const buttons = [...form.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  expect(buttons.map(button => button.tabIndex)).toEqual([0, 0]);
  buttons[0]!.focus();
  buttons[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await nextTick();
  expect(document.activeElement).toBe(buttons[0]);
});
