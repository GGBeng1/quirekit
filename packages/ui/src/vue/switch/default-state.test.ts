// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import type { Component } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import Switch from "./switch.vue";
import Checkbox from "../checkbox/checkbox.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a native boolean control with an optional controlled value.
 * @param component - The public Switch or Checkbox adapter.
 * @param readOnly - Whether the initial value is protected from user modification.
 * @param initialChecked - Controlled value; omitted for an uncontrolled control.
 * @param defaultChecked - Initial uncontrolled value, including Checkbox mixed state.
 * @returns Form input, host props and recorded model updates.
 */
async function mountDefault(
  component: Component,
  readOnly: boolean,
  initialChecked?: boolean,
  defaultChecked: boolean | "indeterminate" = true
) {
  const props = reactive({ disabled: false, readOnly, checked: initialChecked });
  const changes: unknown[] = [];
  const form = document.createElement("form");
  document.body.append(form);
  const app = createApp(defineComponent({
    setup: () => () => h(component, {
      disabled: props.disabled, readOnly: props.readOnly,
      ...(props.checked === undefined ? {} : { checked: props.checked }),
      label: "组织策略", defaultChecked, name: "policy",
      "onUpdate:checked": (value: unknown) => { changes.push(value); }
    })
  }));
  app.mount(form);
  cleanups.push(() => { app.unmount(); form.remove(); });
  await nextTick();
  return { form, input: form.querySelector<HTMLInputElement>("input")!, props, changes };
}

describe.each([["Switch", Switch], ["Checkbox", Checkbox]] as const)("%s uncontrolled defaults", (_, component) => {
  it("uses defaultChecked before the first user change and submits the actual value", async () => {
    const { form, input, changes } = await mountDefault(component, false);
    expect(input.checked).toBe(true);
    expect(new FormData(form).get("policy")).toBe("on");
    input.click();
    await nextTick();
    expect(input.checked).toBe(false);
    expect(new FormData(form).has("policy")).toBe(false);
    expect(changes).toEqual([false]);
  });

  it("preserves a readonly default and removes disabled values from submission", async () => {
    const { form, input, props, changes } = await mountDefault(component, true);
    expect(input.checked).toBe(true);
    input.focus();
    expect(document.activeElement).toBe(input);
    input.click();
    await nextTick();
    expect(input.checked).toBe(true);
    expect(changes).toEqual([]);
    expect(new FormData(form).get("policy")).toBe("on");
    props.disabled = true;
    await nextTick();
    expect(input.disabled).toBe(true);
    expect(new FormData(form).has("policy")).toBe(false);
  });

  it("honors an explicit false value and later host updates over the default", async () => {
    const { form, input, props, changes } = await mountDefault(component, false, false);
    expect(input.checked).toBe(false);
    expect(new FormData(form).has("policy")).toBe(false);
    props.checked = true;
    await nextTick();
    expect(input.checked).toBe(true);
    expect(new FormData(form).get("policy")).toBe("on");
    props.checked = false;
    await nextTick();
    expect(input.checked).toBe(false);
    expect(changes).toEqual([]);
  });
});

it("preserves an uncontrolled Checkbox mixed state until native activation", async () => {
  const { form, input, changes } = await mountDefault(Checkbox, false, undefined, "indeterminate");
  expect(input.indeterminate).toBe(true);
  expect(input.checked).toBe(false);
  expect(new FormData(form).has("policy")).toBe(false);
  input.click();
  await nextTick();
  expect(input.indeterminate).toBe(false);
  expect(input.checked).toBe(true);
  expect(new FormData(form).get("policy")).toBe("on");
  expect(changes).toEqual([true]);
});
