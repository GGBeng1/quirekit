import { useQuireOverlayHost } from "../overlay-provider";
import { createListCollection } from "@ark-ui/vue/combobox";
import { computed, nextTick, ref, watch } from "vue";
import type { ComboboxEmit, ComboboxModelProps } from "./types";
import { groupComboboxItems } from "./collection";

/**
 * Adapts Ark's array and input state to QuireKit's public single-value contract.
 *
 * @param props - Normalized Combobox component properties.
 * @param emit - Vue event boundary used to expose controlled updates.
 * @returns Reactive values and handlers consumed by the Combobox anatomy.
 */
export function useComboboxModel(
  props: Readonly<ComboboxModelProps>,
  emit: ComboboxEmit
) {
  const initialValue = props.defaultValue;
  const initialInputValue = props.defaultInputValue;
  const internalValue = ref(props.modelValue === undefined ? initialValue : props.modelValue ?? undefined);
  const initialItem = props.items.find(item => item.value === internalValue.value);
  const internalInputValue = ref(
    props.inputValue ?? props.defaultInputValue ?? initialItem?.label ?? internalValue.value ?? ""
  );
  const internalOpen = ref(false);
  const open = computed(() => props.open ?? internalOpen.value);
  const selectedValue = computed(() => props.modelValue === undefined ? internalValue.value : props.modelValue);
  const inputValue = computed(() => props.inputValue ?? internalInputValue.value);
  const selectedValues = computed(() => (
    selectedValue.value == null ? [] : [selectedValue.value]
  ));
  const availableItems = computed(() => {
    const items = [...props.items];
    const value = selectedValue.value;
    if (props.allowCustomValue && value && !items.some(item => item.value === value)) items.push({ value, label: value });
    return items;
  });
  const selectedItem = computed(() => availableItems.value.find(item => item.value === selectedValue.value));
  const normalizedQuery = computed(() => {
    const query = inputValue.value.trim().toLocaleLowerCase();
    const selectedLabel = (selectedItem.value?.label ?? selectedValue.value)?.trim().toLocaleLowerCase();
    return query === selectedLabel ? "" : query;
  });
  const filteredItems = computed(() => {
    const query = normalizedQuery.value;
    const items = props.filter === "none" || query.length === 0 ? [...availableItems.value] : availableItems.value.filter((item) => {
      const searchableText = [item.label, ...(item.keywords ?? [])].join(" ").toLocaleLowerCase();
      return props.filter === "startsWith" ? searchableText.startsWith(query) : searchableText.includes(query);
    });
    const customValue = inputValue.value.trim();
    // An actual collection item gives custom input the same keyboard/selection contract as presets.
    if (props.allowCustomValue && query && customValue && !availableItems.value.some(item => item.value === customValue || item.label === customValue)) {
      items.unshift({ value: customValue, label: customValue });
    }
    return items;
  });
  const groupedItems = computed(() => groupComboboxItems(filteredItems.value));
  const collection = computed(() => createListCollection({
    items: filteredItems.value,
    itemToString: item => item.label,
    itemToValue: item => item.value,
    isItemDisabled: item => item.disabled === true
  }));
  const optionalRootBindings = computed(() => ({
    ...(props.form === undefined ? {} : { form: props.form })
  }));
  const controlStyle = computed(() => ({ width: props.width }));
  const contentStyle = computed(() => ({ width: props.contentWidth ?? props.width }));
  const portal = useQuireOverlayHost();
  const positioning = computed(() => ({
    ...(portal.strategy.value ? { strategy: portal.strategy.value } : {}),
    placement: props.placement,
    gutter: 4,
    sameWidth: props.contentWidth === undefined
  }));

  watch(() => props.modelValue, (value) => {
    if (value === undefined) return;
    internalValue.value = value ?? undefined;
    if (props.inputValue === undefined) internalInputValue.value = props.items.find(item => item.value === value)?.label ?? value ?? "";
  }, { flush: "sync" });

  watch(() => props.inputValue, (value) => {
    if (value !== undefined) internalInputValue.value = value;
  });

  watch(() => props.items, (_items, previousItems) => {
    if (props.inputValue !== undefined) return;
    const item = props.items.find(candidate => candidate.value === selectedValue.value);
    const previousLabel = previousItems?.find(candidate => candidate.value === selectedValue.value)?.label;
    if (item !== undefined && (internalInputValue.value.length === 0 || internalInputValue.value === previousLabel)) {
      internalInputValue.value = item.label;
    }
  });

  /**
   * Restores Ark's single-element array to the public scalar contract.
   *
   * @param values - Selection array emitted by the Ark machine.
   */
  function updateValue(values: string[]): void {
    const value = values[0];
    internalValue.value = value;
    emit("update:modelValue", value);
    emit("valueChange", value);
  }

  /**
   * Synchronizes the visible input text and its controlled boundary.
   *
   * @param value - Text displayed by the input on the next frame.
   */
  function updateInputValue(value: string): void {
    internalInputValue.value = value;
    emit("update:inputValue", value);
    emit("inputValueChange", value);
  }

  /**
   * Synchronizes the popup state and notifies the caller.
   *
   * @param value - Whether the result popup is open.
   */
  function updateOpen(value: boolean): void {
    internalOpen.value = value;
    emit("update:open", value);
    emit("openChange", value);
    // Wait for the owner to accept/normalize the selection before restoring the collapsed label.
    if (!value && props.modelValue !== undefined && props.inputValue === undefined) {
      void nextTick(() => {
        const selected = props.modelValue;
        internalInputValue.value = props.items.find(item => item.value === selected)?.label ?? selected ?? "";
      });
    }
  }

  /** Restores only uncontrolled defaults; controlled values remain owned by the caller. */
  function reset(): void {
    if (props.modelValue === undefined) {
      internalValue.value = initialValue;
      emit("update:modelValue", internalValue.value);
    }
    if (props.inputValue === undefined) {
      const value = selectedValue.value;
      internalInputValue.value = initialInputValue ?? props.items.find(item => item.value === value)?.label ?? value ?? "";
      emit("update:inputValue", internalInputValue.value);
    }
    updateOpen(false);
  }

  return {
    collection,
    contentStyle,
    controlStyle,
    filteredItems,
    groupedItems,
    inputValue,
    open,
    optionalRootBindings,
    positioning,
    reset,
    selectedValues,
    updateInputValue,
    updateOpen,
    updateValue
  };
}
