<script setup lang="ts">
import { computed, shallowRef, useId } from "vue";
import { Checkbox } from "@ark-ui/vue/checkbox";
import type { QuireKitCheckboxGroupContext, QuireKitCheckboxGroupItem, QuireKitCheckboxGroupProps } from "../../components/checkbox-group";
import { QuireCheckbox } from "../checkbox";
import { assertChoiceValues, useChoiceState } from "../shared/choice-state/model";
import ChoiceFieldItem from "../shared/choice-state/field-item.vue";
import { checkboxAllState, checkboxToggleAll } from "./model";
const props = withDefaults(defineProps<QuireKitCheckboxGroupProps>(), { size: "sm", orientation: "vertical", hideLabel: false, disabled: false, readOnly: false, invalid: false });
const emit = defineEmits<{
  /** Requested next array; controlled props remain owned by the host. */
  "update:modelValue": [value: string[]];
}>();
defineSlots<{
  /** Compose a select-all checkbox or explanatory content before the options. */
  before?: (context: QuireKitCheckboxGroupContext) => unknown;
  /** Content after all options. */
  after?: (context: QuireKitCheckboxGroupContext) => unknown;
  /** Replace an item's label, retaining its native checkbox control. */
  item?: (context: { item: QuireKitCheckboxGroupItem; checked: boolean }) => unknown;
}>();
const groupId = useId();
const root = shallowRef<HTMLElement | null>(null);
const { values, update } = useChoiceState(props, value => emit("update:modelValue", value), root);
const choices = computed(() => { assertChoiceValues(props.items); return props.items; });
const context = computed<QuireKitCheckboxGroupContext>(() => ({
  value: values.value, allChecked: checkboxAllState(choices.value, values.value),
  allDisabled: props.disabled || choices.value.every(item => item.disabled), readOnly: props.readOnly,
  size: props.size, toggleAll
}));
/** Toggles only enabled options; the shared state controller guards readonly and disabled. */
function toggleAll(): void { update(checkboxToggleAll(choices.value, values.value)); }
/**
 * Omits absent native props instead of overriding child defaults with undefined.
 * @param item - Current option.
 * @returns Public QuireCheckbox bindings.
 */
function itemBindings(item: QuireKitCheckboxGroupItem) {
  return {
    label: item.label, value: item.value, checked: values.value.includes(item.value),
    size: props.size, disabled: props.disabled || item.disabled === true, readOnly: props.readOnly, invalid: props.invalid,
    ...(item.description === undefined ? {} : { description: item.description }),
    ...(props.name === undefined ? {} : { name: props.name }),
    ...(props.form === undefined ? {} : { form: props.form })
  };
}
</script>
<template>
  <fieldset ref="root" :disabled="disabled" :form="form" :aria-invalid="invalid || undefined" class="qk-checkbox-group">
    <legend :id="`${groupId}-label`" :class="hideLabel ? 'sr-only' : 'qk-checkbox-group__label'">{{ label }}</legend>
    <div class="qk-checkbox-group__content">
      <ChoiceFieldItem :value="`${groupId}:before`"><slot name="before" v-bind="context" /></ChoiceFieldItem>
      <!-- Ark owns individual selection; bulk actions stay outside its item context. -->
      <Checkbox.Group :model-value="[...values]" :disabled="disabled" :read-only="readOnly" :invalid="invalid" :aria-labelledby="`${groupId}-label`" :class="['qk-checkbox-group__items', `qk-checkbox-group__items--${orientation}`]" @update:model-value="update">
        <ChoiceFieldItem v-for="item in choices" :key="item.value" :value="`${groupId}:item:${item.value}`">
        <QuireCheckbox v-bind="itemBindings(item)">
          <template #default><slot name="item" :item="item" :checked="values.includes(item.value)">{{ item.label }}</slot></template>
        </QuireCheckbox>
        </ChoiceFieldItem>
      </Checkbox.Group>
      <ChoiceFieldItem :value="`${groupId}:after`"><slot name="after" v-bind="context" /></ChoiceFieldItem>
    </div>
  </fieldset>
</template>
