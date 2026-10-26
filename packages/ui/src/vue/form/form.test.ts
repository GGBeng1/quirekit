// @vitest-environment happy-dom
import { h, reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import Form from "./form.vue";
import FormField from "../form-field/form-field.vue";
import Input from "../input/input.vue";
import type { QuireKitFormFieldSlotProps } from "../form-field/types";
import { mountForm, settle } from "./testing";

/** Renders the standard text adapter from the public slot contract.
 * @param slot - Registered field state and bindings.
 * @returns The bound input.
 */
function input(slot: QuireKitFormFieldSlotProps) {
  return h(Input, { ...slot.controlProps, modelValue: String(slot.value ?? ""),
    disabled: slot.controlProps.disabled ?? false, readOnly: slot.controlProps.readOnly ?? false,
    required: slot.controlProps.required ?? false });
}

describe("QuireForm lifecycle", () => {
  it("validates required nested paths, focuses errors, revalidates corrections and resets the baseline", async () => {
    const save = vi.fn();
    const initial = reactive({ profile: { name: "" } });
    const { host, context } = await mountForm(probe => h(Form, { initialValues: initial, onSubmit: save }, () => [
      probe, h(FormField, { name: "profile.name", label: "Name", required: true }, { default: input })
    ]));
    expect(host.textContent).not.toContain("请填写");
    await context.submit();
    expect(save).not.toHaveBeenCalled();
    expect(context.errors.value["profile.name"]).toBeTruthy();
    expect(document.activeElement).toBe(host.querySelector("input"));
    const control = host.querySelector("input")!;
    control.value = "Ada";
    control.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(context.errors.value["profile.name"]).toBeUndefined();
    initial.profile.name = "External update";
    await settle();
    expect(context.values).toEqual({ profile: { name: "Ada" } });
    await context.submit();
    expect(save.mock.calls[0]?.[0]).toEqual({ profile: { name: "Ada" } });
    context.resetForm();
    await settle();
    expect(context.values).toEqual({ profile: { name: "" } });
    expect(context.meta.value.touched).toBe(false);
    expect(context.submitCount.value).toBe(0);
    expect(context.errors.value).toEqual({});
  });

  it("locks validation and saving, rejects resets while busy, and recovers from failed requests", async () => {
    let release!: () => void;
    const save = vi.fn(async () => { await new Promise<void>(resolve => { release = resolve; }); throw new Error("Offline"); });
    const onError = vi.fn();
    const { context } = await mountForm(probe => h(Form, { onSubmit: save, onError }, () => probe));
    const pending = context.submit();
    expect(context.isSubmitting.value).toBe(true);
    expect(context.resetForm()).toBe(false);
    await context.submit();
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
    release();
    await pending;
    expect(context.isSubmitting.value).toBe(false);
    expect(context.submitError.value).toBe("Offline");
    expect(onError).toHaveBeenCalledOnce();
    expect(context.resetForm()).toBe(true);
    expect(context.submitError.value).toBeUndefined();
  });

  it("waits for async validation and exposes recoverable server field errors", async () => {
    let release!: (value: true | string) => void;
    let slow = false;
    const rules = vi.fn(() => slow ? new Promise<true | string>(resolve => { release = resolve; }) : true);
    const save = vi.fn((_values, actions) => actions.setErrors({ email: "Already used" }));
    const { context, host } = await mountForm(probe => h(Form, { initialValues: { email: "a@b.co" }, onSubmit: save }, () => [
      probe, h(FormField, { name: "email", label: "Email", rules }, { default: input })
    ]));
    slow = true;
    const pending = context.submit();
    await settle();
    await context.submit();
    expect(save).not.toHaveBeenCalled();
    expect(context.submitCount.value).toBe(1);
    release(true);
    await pending;
    expect(context.errors.value.email).toBe("Already used");
    expect(context.values.email).toBe("a@b.co");
    expect(document.activeElement).toBe(host.querySelector("input"));
  });
});
