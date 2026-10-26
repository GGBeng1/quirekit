// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import type { Component } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import RadioGroup from "./radio-group.vue";
import Segmented from "../segmented/segmented.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a public radio family inside a real HTML form.
 * @param component - RadioGroup or Segmented under test.
 * @returns The form, current controls and mutable host state.
 */
async function mountChoice(component: Component) {
  const state = reactive({ readOnly: true, disabled: false, value: "draft" });
  const form = document.createElement("form");
  document.body.append(form);
  const app = createApp(defineComponent({
    setup: () => () => h(component, {
      label: "Status", name: "status", modelValue: state.value,
      items: [{ value: "draft", label: "Draft" }, { value: "review", label: "Review" }, { value: "locked", label: "Locked", disabled: true }],
      readOnly: state.readOnly, disabled: state.disabled,
      "onUpdate:modelValue": (value: string) => { state.value = value; }
    })
  }));
  app.mount(form);
  cleanups.push(() => { app.unmount(); form.remove(); });
  await nextTick();
  const inputs = [...form.querySelectorAll<HTMLInputElement>("input[type=radio]")];
  return { form, state, inputs };
}

describe.each([["RadioGroup", RadioGroup], ["Segmented", Segmented]] as const)("%s readonly form behavior", (_, component) => {
  it("keeps readonly values focusable and successful without allowing pointer or native keyboard changes", async () => {
    const fixture = await mountChoice(component);
    const [draft, review, locked] = fixture.inputs;
    expect(draft!.disabled).toBe(false);
    expect(locked!.disabled).toBe(true);
    draft!.focus();
    expect(document.activeElement).toBe(draft);
    expect(new FormData(fixture.form).get("status")).toBe("draft");
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      draft!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(draft!.checked).toBe(true);
    review!.click();
    await nextTick();
    expect(fixture.state.value).toBe("draft");
  });

  it("changes disabled and readonly policies without replacing inputs or losing the current value", async () => {
    const fixture = await mountChoice(component);
    fixture.state.disabled = true;
    await nextTick();
    expect(fixture.inputs.every(input => input.disabled)).toBe(true);
    expect(new FormData(fixture.form).has("status")).toBe(false);
    fixture.state.disabled = false;
    fixture.state.readOnly = false;
    await nextTick();
    expect(fixture.form.querySelector("input")).toBe(fixture.inputs[0]);
    fixture.inputs[1]!.click();
    await nextTick();
    expect(fixture.state.value).toBe("review");
    expect(new FormData(fixture.form).get("status")).toBe("review");
  });
});
