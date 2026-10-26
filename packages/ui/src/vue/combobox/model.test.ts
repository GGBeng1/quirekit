import { effectScope, nextTick, reactive } from "vue";
import { expect, it, vi } from "vitest";
import { useComboboxModel } from "./use-combobox-model";

it("treats controlled null as empty and keeps popup ownership with its caller", async () => {
  const scope = effectScope();
  const initial: Parameters<typeof useComboboxModel>[0] = {
    modelValue: null, defaultValue: "edit", open: false,
    inputValue: undefined, defaultInputValue: undefined,
    items: [{ value: "edit", label: "编辑" }], filter: "contains",
    width: "200px", contentWidth: undefined, placement: "bottom-start",
    name: undefined, form: undefined
  };
  const props = reactive({ ...initial });
  const emit = vi.fn();
  const model = scope.run(() => useComboboxModel(props, emit))!;
  try {
    expect(model.selectedValues.value).toEqual([]);
    expect(model.inputValue.value).toBe("");
    props.modelValue = "edit";
    await nextTick();
    expect(model.inputValue.value).toBe("编辑");
    props.modelValue = null;
    await nextTick();
    expect(model.inputValue.value).toBe("");
    expect(model.selectedValues.value).toEqual([]);
    model.updateOpen(true);
    expect(emit).toHaveBeenCalledWith("update:open", true);
    expect(model.open.value).toBe(false);
    props.open = true;
    expect(model.open.value).toBe(true);
  } finally { scope.stop(); }
});

it("admits custom values as real options while preserving caller labels and search drafts", async () => {
  const scope = effectScope();
  const initial: Parameters<typeof useComboboxModel>[0] = {
    allowCustomValue: true, modelValue: "12", defaultValue: undefined, open: undefined,
    inputValue: undefined, defaultInputValue: undefined, items: [{ value: "12", label: "小四" }], filter: "contains",
    width: "72px", contentWidth: undefined, placement: "bottom-start", name: undefined, form: undefined
  };
  const props = reactive({ ...initial });
  const model = scope.run(() => useComboboxModel(props, vi.fn()))!;
  try {
    model.updateInputValue("13.7");
    expect(model.filteredItems.value).toEqual([{ value: "13.7", label: "13.7" }]);
    props.items = [{ value: "12", label: "12 pt" }];
    await nextTick();
    expect(model.inputValue.value).toBe("13.7");
    props.modelValue = "13.5";
    await nextTick();
    expect(model.inputValue.value).toBe("13.5");
    props.allowCustomValue = false;
    model.updateInputValue("13.7");
    expect(model.filteredItems.value).toEqual([]);
    model.updateOpen(false);
    await nextTick();
    expect(model.inputValue.value).toBe("13.5");
  } finally { scope.stop(); }
});

it("separates the search input name from selected-value submission and resets local defaults", async () => {
  const scope = effectScope();
  const props = reactive<Parameters<typeof useComboboxModel>[0]>({
    modelValue: undefined, defaultValue: "team", open: undefined,
    inputValue: undefined, defaultInputValue: undefined,
    items: [{ value: "team", label: "团队空间" }, { value: "personal", label: "个人空间" }],
    filter: "contains", width: "200px", contentWidth: undefined,
    placement: "bottom-start", name: "space", form: "save-form"
  });
  const emit = vi.fn();
  const model = scope.run(() => useComboboxModel(props, emit))!;
  try {
    expect(model.optionalRootBindings.value).toEqual({ form: "save-form" });
    model.updateValue(["personal"]);
    model.updateInputValue("个人空间");
    model.updateOpen(true);
    model.reset();
    await nextTick();
    expect(model.selectedValues.value).toEqual(["team"]);
    expect(model.inputValue.value).toBe("团队空间");
    expect(model.open.value).toBe(false);
    expect(emit).toHaveBeenCalledWith("update:modelValue", "team");
  } finally { scope.stop(); }
});

it("leaves controlled selection and controlled search drafts with the reset owner", async () => {
  const scope = effectScope();
  const props = reactive<Parameters<typeof useComboboxModel>[0]>({
    modelValue: "personal", defaultValue: "team", open: undefined,
    inputValue: "尚未提交的搜索", defaultInputValue: undefined,
    items: [{ value: "team", label: "团队空间" }, { value: "personal", label: "个人空间" }],
    filter: "contains", width: "200px", contentWidth: undefined,
    placement: "bottom-start", name: "space", form: undefined
  });
  const emit = vi.fn();
  const model = scope.run(() => useComboboxModel(props, emit))!;
  try {
    model.reset();
    await nextTick();
    expect(model.selectedValues.value).toEqual(["personal"]);
    expect(model.inputValue.value).toBe("尚未提交的搜索");
    expect(emit.mock.calls.some(([event]) => event === "update:modelValue" || event === "update:inputValue")).toBe(false);
  } finally { scope.stop(); }
});
