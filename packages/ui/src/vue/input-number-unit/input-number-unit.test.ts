// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from "vue";
import { expect, it } from "vitest";
import QuireField from "../field/field.vue";
import QuireInputNumberUnit from "./input-number-unit.vue";

it("keeps native field identities distinct and preserves empty and disabled states", async () => {
  const state = reactive({ value: null as number | null, disabled: false });
  const host = document.createElement("div");
  document.body.append(host);
  const errors: unknown[] = [];
  const app = createApp({ render: () => h(QuireField, { label: "缩进", id: "indent-value" }, {
    default: ({ controlProps }: { controlProps: Record<string, unknown> }) => h(QuireInputNumberUnit, {
      ...controlProps, label: "缩进", unitLabel: "缩进单位", unit: "cm", units: [{ value: "cm", label: "厘米" }],
      modelValue: state.value, disabled: state.disabled,
      "onUpdate:modelValue": value => { state.value = value; }
    })
  }) });
  app.config.errorHandler = error => errors.push(error);
  try {
    app.mount(host);
    await nextTick();
    const input = host.querySelector<HTMLInputElement>('[role="spinbutton"]')!;
    const select = host.querySelector<HTMLSelectElement>('select')!;
    expect(input.value).toBe("");
    expect(input.id).toBe("indent-value");
    expect(select.id).not.toBe(input.id);
    expect(new Set([...host.querySelectorAll('[id]')].map(element => element.id)).size).toBe(host.querySelectorAll('[id]').length);
    expect(errors).toEqual([]);
    state.value = 2.54;
    await nextTick();
    expect(input.value).toBe("2.54");
    state.disabled = true;
    await nextTick();
    expect(input.disabled).toBe(true);
    expect(host.querySelector<HTMLButtonElement>('[role="combobox"]')?.disabled).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    app.unmount();
    host.remove();
  }
});
