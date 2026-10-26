// @vitest-environment happy-dom
import { defineComponent, h, reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import SchemaForm from "./schema-form.vue";
import { mountForm, settle } from "../form/testing";
import type { QuireKitSchemaNode, QuireKitSchemaFieldSlotProps } from "./types";

describe("QuireSchemaForm", () => {
  it("unmounts hidden fields, skips their validation, and restores nested drafts by stable identity", async () => {
    const state = reactive({ visible: true, reverse: false });
    const nodes: QuireKitSchemaNode[] = [
      { name: "profile.name", label: "Name", control: "input", required: true, visible: () => state.visible },
      { name: "items[0].title", label: "Title", control: "input", required: true }
    ];
    const save = vi.fn();
    const { host, context } = await mountForm(probe => h(SchemaForm, {
      fields: [{ key: "profile", legend: "Profile", children: state.reverse ? [...nodes].reverse() : nodes }],
      initialValues: { profile: { name: "Ada" }, items: [{ title: "Draft" }] }, onSubmit: save
    }, () => probe));
    const input = host.querySelector('input[name="profile.name"]');
    expect(host.querySelectorAll("form")).toHaveLength(1);
    expect(host.querySelectorAll("fieldset")).toHaveLength(1);
    state.reverse = true;
    await settle();
    expect(host.querySelector('input[name="profile.name"]')).toBe(input);
    context.setFieldValue("profile.name", "");
    await context.submit();
    expect(context.errors.value["profile.name"]).toBeTruthy();
    state.visible = false;
    await settle();
    expect(host.querySelector('input[name="profile.name"]')).toBeNull();
    await context.submit();
    expect(save).toHaveBeenCalledOnce();
    expect(context.values.profile).toEqual({ name: "" });
    state.visible = true;
    await settle();
    expect(host.querySelector<HTMLInputElement>('input[name="profile.name"]')?.value).toBe("");
    context.resetForm();
    await settle();
    expect(host.querySelector<HTMLInputElement>('input[name="profile.name"]')?.value).toBe("Ada");
  });

  it("revalidates declared dependencies after interaction and skips disabled fields but validates readonly fields", async () => {
    const check = vi.fn((value, ctx) => value === ctx.form.password || "Passwords differ");
    const nodes: QuireKitSchemaNode[] = [
      { name: "password", label: "Password", control: "input" },
      { name: "confirm", label: "Confirm", control: "input", rules: check, dependsOn: ["password"] },
      { key: "locked", legend: "Locked", disabled: true, children: [{ name: "disabled", label: "Disabled", control: "input", required: true }] },
      { name: "readonly", label: "Readonly", control: "input", readOnly: true, required: true }
    ];
    const { context } = await mountForm(probe => h(SchemaForm, {
      fields: nodes, initialValues: { password: "a", confirm: "a" }
    }, () => probe));
    context.setFieldTouched("confirm", true);
    context.setFieldValue("password", "b");
    await settle();
    expect(context.errors.value.confirm).toBe("Passwords differ");
    await context.submit();
    expect(context.errors.value.disabled).toBeUndefined();
    expect(context.errors.value.readonly).toBeTruthy();
    context.setFieldValue("password", "a");
    await settle();
    expect(context.errors.value.confirm).toBeUndefined();
  });

  it("rejects a dependency mismatch when its value changes and submits in the same tick", async () => {
    const save = vi.fn();
    const nodes: QuireKitSchemaNode[] = [
      { name: "password", label: "Password", control: "input" },
      { name: "confirm", label: "Confirm", control: "input", dependsOn: ["password"],
        rules: async (value, context) => value === context.form.password || "Passwords differ" }
    ];
    const { context } = await mountForm(probe => h(SchemaForm, {
      fields: nodes, initialValues: { password: "initial", confirm: "initial" }, onSubmit: save
    }, () => probe));
    context.setFieldTouched("confirm", true);
    // Deliberately omit nextTick/settle: submission must validate the new dependency.
    context.setFieldValue("password", "changed");
    await context.submit();
    expect(save).not.toHaveBeenCalled();
    expect(context.errors.value.confirm).toBe("Passwords differ");
    expect(context.isSubmitting.value).toBe(false);
    context.setFieldValue("confirm", "changed");
    await context.submit();
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0]?.[0]).toEqual({ password: "changed", confirm: "changed" });
  });

  it("adapts a registered model/event and path slot while preserving labels and field rules", async () => {
    const custom = defineComponent({
      props: ["amount"], emits: ["amountChange"],
      setup: (props, { emit, attrs }) => () => h("input", {
        ...attrs, value: props.amount, onInput: (event: Event) => emit("amountChange", (event.target as HTMLInputElement).value)
      })
    });
    const { host, context } = await mountForm(probe => h(SchemaForm, {
      fields: [
        { name: "quantity", label: "Quantity", control: "quantity", required: true },
        { name: "custom.path", label: "Custom", control: "slot-only", required: true }
      ],
      registry: { quantity: { component: custom, modelProp: "amount", updateEvent: "amountChange", fromControl: Number, toControl: String } },
      initialValues: { quantity: 2, custom: { path: "" } }
    }, {
      default: () => probe,
      "field:custom.path": (slot: QuireKitSchemaFieldSlotProps) => h("input", {
        id: slot.controlProps.id, value: slot.value, onInput: (event: Event) => slot.setValue((event.target as HTMLInputElement).value)
      })
    }));
    const input = host.querySelector<HTMLInputElement>('input[name="quantity"]')!;
    input.value = "12";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(context.values.quantity).toBe(12);
    await context.submit();
    expect(context.errors.value["custom.path"]).toBeTruthy();
    expect(host.querySelectorAll("label")).toHaveLength(2);
  });

  it("renders booleans with one visible caption, label activation and a real required constraint", async () => {
    const { host, context } = await mountForm(probe => h(SchemaForm, {
      fields: [{ name: "agree", label: "Agreement", control: "checkbox", required: true }, { name: "enabled", label: "Enabled", control: "switch" }],
      initialValues: { agree: false, enabled: false }
    }, () => probe));
    expect(host.querySelectorAll(".qk-field__label")).toHaveLength(2);
    expect(host.querySelectorAll(".qk-checkbox__label,.qk-switch__label")).toHaveLength(0);
    expect(host.querySelector(".qk-checkbox")?.tagName).toBe("LABEL");
    expect(host.querySelector(".qk-switch")?.tagName).toBe("LABEL");
    expect(host.querySelector("label label")).toBeNull();
    await context.submit();
    expect(context.errors.value.agree).toBeTruthy();
    host.querySelector<HTMLElement>(".qk-checkbox__control")!.click();
    await settle();
    expect(context.values.agree).toBe(true);
    host.querySelector<HTMLElement>(".qk-switch__control")!.click();
    await settle();
    expect(context.values.enabled).toBe(true);
    await context.submit();
    expect(context.errors.value.agree).toBeUndefined();
  });
});
