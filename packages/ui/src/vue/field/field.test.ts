// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import type { Component } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import Field from "./field.vue";
import Input from "../input/input.vue";
import InputNumber from "../input-number/input-number.vue";
import Textarea from "../textarea/textarea.vue";
import type { QuireKitFieldSlotProps } from "../../components/field";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a field using its complete public control binding.
 * @param component - Input adapter under test.
 * @param controlId - Explicit native control identity, when supplied.
 * @returns The live form and reactive field state.
 */
async function mountField(component: Component, controlId?: string) {
  const state = reactive({ invalid: false, readOnly: false, disabled: false });
  const form = document.createElement("form");
  document.body.append(form);
  const app = createApp(defineComponent({
    setup: () => () => h(Field, {
      label: "Amount", id: "amount", ...(controlId === undefined ? {} : { controlId }), description: "Initial help", errorText: "Enter a valid amount", ...state
    }, {
      default: ({ controlProps }: QuireKitFieldSlotProps) => h(component, {
        ...controlProps, ...(component === InputNumber ? { label: "Amount" } : {}), name: "amount", defaultValue: "12"
      })
    })
  }));
  app.mount(form);
  cleanups.push(() => { app.unmount(); form.remove(); });
  await nextTick();
  await nextTick();
  return { form, state };
}

describe.each([["Input", Input], ["InputNumber", InputNumber], ["Textarea", Textarea]] as const)("Field with %s", (_, component) => {
  it("uses controlId for the native control without duplicating it on the wrapper", async () => {
    const { form } = await mountField(component, "invoice-amount");
    const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>("input,textarea")!;
    expect(input.id).toBe("invoice-amount");
    expect(form.querySelector("label")!.htmlFor).toBe("invoice-amount");
    expect(form.querySelectorAll('[id="invoice-amount"]')).toHaveLength(1);
    const descriptionId = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(descriptionId)?.textContent).toBe("Initial help");
  });

  it("associates the label and changing feedback with the native input without replacing it", async () => {
    const { form, state } = await mountField(component);
    const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>("input,textarea")!;
    expect(form.querySelector("label")!.htmlFor).toBe(input.id);
    if (component === InputNumber) {
      expect([...form.querySelectorAll("button")].map(button => button.getAttribute("aria-label")))
        .toEqual(["增加Amount", "减少Amount"]);
    }
    const descriptionId = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(descriptionId)?.textContent).toBe("Initial help");
    input.focus();
    state.invalid = true;
    await nextTick();
    await nextTick();
    expect(form.querySelector("input,textarea")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const feedbackIds = [input.getAttribute("aria-describedby"), input.getAttribute("aria-errormessage")]
      .filter(Boolean).join(" ").split(/\s+/);
    expect(feedbackIds.some(id => document.getElementById(id)?.textContent === "Enter a valid amount")).toBe(true);
    expect(input.value).toBe("12");
    state.invalid = false;
    state.readOnly = true;
    await nextTick();
    expect(input.readOnly).toBe(true);
    expect(new FormData(form).get("amount")).toBe("12");
    state.disabled = true;
    await nextTick();
    expect(input.disabled).toBe(true);
    // Happy DOM omits its disabled check for textarea FormData entries.
    // The native disabled property is authoritative; browser coverage checks submission.
    if (input.tagName === "INPUT") expect(new FormData(form).has("amount")).toBe(false);
  });
});
