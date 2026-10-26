<script setup lang="ts">
import QuireField from "../field/field.vue";
import { computed } from "vue";
import { useFormFieldBinding } from "./use-binding";
import { normalizeFormFieldPath } from "./path";
import type { QuireKitFieldSlotProps } from "../../components/field";
import type { QuireKitFormFieldFeedbackSlotProps, QuireKitFormFieldProps, QuireKitFormFieldSlotProps } from "./types";

const props = withDefaults(defineProps<QuireKitFormFieldProps>(), { keepValueOnUnmount: true });
defineSlots<{
  /** Render one input, binding controlProps or using the custom model actions. */
  default: (field: QuireKitFormFieldSlotProps) => unknown;
  /** Short information or an action next to the label. */
  meta?: (field: QuireKitFormFieldFeedbackSlotProps) => unknown;
  /** Replaces the current feedback text without removing its semantic container. */
  message?: (field: QuireKitFormFieldFeedbackSlotProps) => unknown;
}>();
const { field, disabled, readOnly, setValue, handleBlur } = useFormFieldBinding(props);
const { errorMessage, errors, meta } = field;
const feedback = computed(() => ({ value: field.value.value, meta, errorMessage: errorMessage.value }));
const visualProps = computed(() => ({
  ...(props.id === undefined ? {} : { id: props.id }),
  ...(props.description === undefined ? {} : { description: props.description }),
  ...(props.disabledReason === undefined ? {} : { disabledReason: props.disabledReason }),
  ...(errorMessage.value === undefined ? {} : { errorText: errorMessage.value })
}));

/** Combines Field's accessible attributes with the controlled model contract.
 * @param visual - QuireField's control association and feedback state.
 * @returns Custom control slot context.
 */
function slotProps(visual: QuireKitFieldSlotProps): QuireKitFormFieldSlotProps {
  return {
    ...visual, value: field.value.value, setValue, handleBlur, validate: field.validate, meta,
    errorMessage: errorMessage.value,
    controlProps: {
      ...visual.controlProps,
      required: visual.controlProps.required ?? false,
      disabled: visual.controlProps.disabled ?? false,
      readOnly: visual.controlProps.readOnly ?? false,
      name: props.name, modelValue: field.value.value, "onUpdate:modelValue": setValue
    }
  };
}

/** Treats a compound control as one blur boundary.
 * @param event - Bubbling native focusout event.
 */
function onFocusout(event: FocusEvent): void {
  if (event.relatedTarget instanceof Node && (event.currentTarget as HTMLElement).contains(event.relatedTarget)) return;
  handleBlur();
}
</script>

<template>
  <QuireField v-bind="visualProps" :label="label"
    :width="width ?? '100%'" :required="required" :disabled="disabled" :read-only="readOnly"
    :invalid="errors.length > 0 && !disabled" :busy="meta.pending"
    :data-form-field="normalizeFormFieldPath(name)" @focusout="onFocusout">
    <template #default="visual"><div data-form-control class="qk-form__control"><slot v-bind="slotProps(visual)" /></div></template>
    <template v-if="$slots.meta" #meta><slot name="meta" v-bind="feedback" :status="undefined" /></template>
    <template v-if="$slots.message" #message="visual"><slot name="message" v-bind="feedback" :status="visual.status" /></template>
  </QuireField>
</template>
