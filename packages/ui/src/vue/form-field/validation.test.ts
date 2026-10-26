// @vitest-environment happy-dom
import { h, reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import Form from "../form/form.vue";
import FormField from "./form-field.vue";
import { mountForm, settle } from "../form/testing";
import type { QuireKitFormFieldSlotProps } from "./types";

/** Mounts a field with controllable delayed validation and captures its public slot.
 * @returns Form, field, reactive display state and delayed validation completions.
 */
async function mountAsyncField() {
  const state = reactive({ disabled: false, visible: true });
  const requests: Array<{ resolve: (result: string | true) => void; reject: (error: Error) => void }> = [];
  const onError = vi.fn();
  const rules = vi.fn((value: unknown) => value === "old"
    ? new Promise<string | true>((resolve, reject) => { requests.push({ resolve, reject }); })
    : value === "invalid" ? "Current invalid value" : true);
  let slot!: QuireKitFormFieldSlotProps;
  const mounted = await mountForm(probe => h(Form, { initialValues: { name: "baseline" }, onError }, () => [
    probe, state.visible ? h(FormField, { name: "name", label: "Name", rules, disabled: state.disabled }, {
      default: (field: QuireKitFormFieldSlotProps) => { slot = field; return h("input", { id: field.controlProps.id, value: field.value }); }
    }) : null
  ]));
  return { ...mounted, state, requests, onError, get slot() { return slot; } };
}

describe("field validation generations", () => {
  it.each(["good", "invalid"])("never publishes the earlier blur result after a later %s edit", async value => {
    const fixture = await mountAsyncField();
    fixture.slot.setValue("old");
    await settle();
    fixture.slot.handleBlur();
    await settle();
    expect(fixture.slot.meta.pending).toBe(true);
    expect(fixture.requests.length).toBeGreaterThanOrEqual(2);
    fixture.slot.setValue(value);
    await settle();
    for (const request of fixture.requests) request.resolve("Stale invalid value");
    await settle();
    expect(fixture.context.values.name).toBe(value);
    expect(fixture.context.errors.value.name).toBe(value === "good" ? undefined : "Current invalid value");
    expect(fixture.slot.meta.pending).toBe(false);
  });

  it("invalidates pending validation when resetting, even if the new baseline has its own error", async () => {
    const fixture = await mountAsyncField();
    fixture.slot.setValue("old");
    fixture.slot.handleBlur();
    await settle();
    expect(fixture.context.resetForm({ values: { name: "replacement" }, errors: { name: "New server error" } }, { force: true })).toBe(true);
    await settle();
    expect(fixture.slot.meta.pending).toBe(false);
    for (const request of fixture.requests) request.reject(new Error("Old network error"));
    await settle();
    expect(fixture.context.values.name).toBe("replacement");
    expect(fixture.context.errors.value.name).toBe("New server error");
    expect(fixture.slot.meta.touched).toBe(false);
    expect(fixture.slot.meta.validated).toBe(false);
    expect(fixture.context.submitError.value).toBeUndefined();
    expect(fixture.onError).not.toHaveBeenCalled();
  });

  it.each(["disable", "hide"])("ignores delayed rejections after %s and preserves the draft", async action => {
    const fixture = await mountAsyncField();
    fixture.slot.setValue("old");
    fixture.slot.handleBlur();
    await settle();
    if (action === "disable") fixture.state.disabled = true;
    else fixture.state.visible = false;
    await settle();
    for (const request of fixture.requests) request.reject(new Error("Stale failure"));
    await settle();
    expect(fixture.context.errors.value).toEqual({});
    expect(fixture.context.values.name).toBe("old");
    expect(fixture.context.submitError.value).toBeUndefined();
    expect(fixture.onError).not.toHaveBeenCalled();
    await fixture.context.submit();
    expect(fixture.context.errors.value).toEqual({});
  });

  it("also supersedes pending blur validation for a programmatic write with validation disabled", async () => {
    const fixture = await mountAsyncField();
    fixture.slot.setValue("old");
    fixture.slot.handleBlur();
    await settle();
    fixture.context.setFieldValue("name", "good", false);
    await settle();
    for (const request of fixture.requests) request.resolve("Stale invalid value");
    await settle();
    expect(fixture.context.errors.value).toEqual({});
    expect(fixture.slot.meta.pending).toBe(false);
  });
});
