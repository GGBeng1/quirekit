// @vitest-environment happy-dom
import { effectScope, nextTick, reactive, ref } from "vue";
import { expect, it, vi } from "vitest";
import { assertChoiceValues, useChoiceState } from "./model";

it("keeps controlled updates owned by the host and guards readonly/disabled interactions", () => {
  const scope = effectScope();
  const props = reactive({ modelValue: ["a"], defaultValue: ["b"], readOnly: false, disabled: false });
  const emit = vi.fn();
  const model = scope.run(() => useChoiceState(props, emit, ref(null)))!;
  model.update(["b", "b"]);
  expect(model.values.value).toEqual(["a"]);
  expect(emit).toHaveBeenLastCalledWith(["b"]);
  props.modelValue = ["b"];
  expect(model.values.value).toEqual(["b"]);
  emit.mockClear();
  props.readOnly = true;
  model.update([]);
  expect(emit).not.toHaveBeenCalled();
  props.readOnly = false;
  props.disabled = true;
  model.update([]);
  expect(emit).not.toHaveBeenCalled();
  scope.stop();
});

it("restores local native defaults only after an uncancelled reset", async () => {
  const form = document.createElement("form");
  const root = document.createElement("div");
  form.append(root);
  document.body.append(form);
  const scope = effectScope();
  const model = scope.run(() => useChoiceState({ defaultValue: ["a"] }, vi.fn(), ref(root)))!;
  await nextTick();
  model.update(["b"]);
  const prevent = (event: Event) => event.preventDefault();
  form.addEventListener("reset", prevent);
  form.reset();
  await nextTick();
  expect(model.values.value).toEqual(["b"]);
  form.removeEventListener("reset", prevent);
  form.reset();
  await nextTick();
  expect(model.values.value).toEqual(["a"]);
  scope.stop();
  form.remove();
});

it("rejects duplicate or empty item identities", () => {
  expect(() => assertChoiceValues([{ value: "" }])).toThrow();
  expect(() => assertChoiceValues([{ value: "a" }, { value: "a" }])).toThrow();
});
