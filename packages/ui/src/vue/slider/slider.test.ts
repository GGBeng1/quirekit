// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import Slider from "./slider.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/** @returns A controlled range slider with observable native form values. */
async function mountRange() {
  const state = reactive({ disabled: false, readOnly: true, value: [20, 80] });
  const form = document.createElement("form");
  document.body.append(form);
  const app = createApp(defineComponent({
    setup: () => () => h(Slider, {
      label: "Pages", name: "pages", thumbLabels: ["Start", "End"],
      modelValue: state.value, disabled: state.disabled, readOnly: state.readOnly,
      "onUpdate:modelValue": (value: number[] | undefined) => { if (value) state.value = value; }
    })
  }));
  app.mount(form);
  cleanups.push(() => { app.unmount(); form.remove(); });
  await nextTick();
  return { form, state };
}

describe("Slider native form state", () => {
  it("keeps readonly thumbs focusable and values submitted without allowing keyboard edits", async () => {
    const { form, state } = await mountRange();
    const thumb = form.querySelector<HTMLElement>("[role=slider]")!;
    thumb.focus();
    expect(document.activeElement).toBe(thumb);
    expect(thumb.getAttribute("aria-readonly")).toBe("true");
    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await nextTick();
    expect(state.value).toEqual([20, 80]);
    expect(new FormData(form).getAll("pages[]")).toEqual(["20", "80"]);
  });

  it("excludes disabled values from form data and restores the same inputs when re-enabled", async () => {
    const { form, state } = await mountRange();
    const inputs = [...form.querySelectorAll("input")];
    state.disabled = true;
    await nextTick();
    expect(new FormData(form).has("pages[]")).toBe(false);
    expect(inputs.every(input => input.disabled)).toBe(true);
    state.disabled = false;
    await nextTick();
    expect([...form.querySelectorAll("input")]).toEqual(inputs);
    expect(new FormData(form).getAll("pages[]")).toEqual(["20", "80"]);
  });
});
