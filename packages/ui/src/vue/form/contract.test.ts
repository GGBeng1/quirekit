// @vitest-environment happy-dom
import { h } from "vue";
import { describe, expect, it, vi } from "vitest";
import Form from "./form.vue";
import FormField from "../form-field/form-field.vue";
import type { QuireKitFormFieldSlotProps } from "../form-field/types";
import type { QuireKitFormValues } from "./types";
import { mountForm, settle } from "./testing";

describe("form submission contracts", () => {
  it("freezes the public draft mutation surface throughout validation and saving", async () => {
    let validate!: (result: true) => void;
    let save!: () => void;
    let slow = false;
    const onSubmit = vi.fn(async (_values: QuireKitFormValues) => { await new Promise<void>(resolve => { save = resolve; }); });
    const rules = () => slow ? new Promise<true>(resolve => { validate = resolve; }) : true;
    const { context } = await mountForm(probe => h(Form, { initialValues: { name: "initial" }, onSubmit }, () => [
      probe, h(FormField, { name: "name", label: "Name", rules }, () => null)
    ]));
    slow = true;
    const pending = context.submit();
    expect(context.setFieldValue("name", "during validation")).toBe(false);
    expect(context.setValues({ name: "also blocked" })).toBe(false);
    await settle();
    validate(true);
    await settle();
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: "initial" });
    expect(context.setFieldValue("name", "during save")).toBe(false);
    save();
    await pending;
    expect(context.setFieldValue("name", "after save", false)).toBe(true);
    expect(context.values.name).toBe("after save");
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: "initial" });
  });

  it("focuses the control rather than a label meta action", async () => {
    const { context, host } = await mountForm(probe => h(Form, {}, () => [
      probe, h(FormField, { name: "name", label: "Name", required: true }, {
        default: (slot: QuireKitFormFieldSlotProps) => h("input", { id: slot.controlProps.id }),
        meta: () => h("button", { type: "button" }, "Help")
      })
    ]));
    await context.submit();
    expect(document.activeElement).toBe(host.querySelector("input"));
  });
});
