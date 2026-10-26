<script setup lang="ts">
import { Field } from "@ark-ui/vue/field";
import { computed, useAttrs } from "vue";
import type { QuireKitInputNumberUnitProps } from "../../components/input-number-unit";
import QuireInputNumber from "../input-number/input-number.vue";
import { useQuireKitLocale } from "../locale-provider/context";
import QuireSelect from "../select/select.vue";
import QuireSpace from "../space/space.vue";

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitInputNumberUnitProps>(), {
  size: "sm", width: "100%", unitWidth: "6em",
  disabled: false, invalid: false, step: 1, precision: 2
});
const emit = defineEmits<{
  /** Finite number, or null while the numeric input is empty/invalid. */
  "update:modelValue": [value: number | null];
  /** Unit selection only; never implicitly converts or overwrites the value. */
  "update:unit": [unit: string];
}>();
const attrs = useAttrs();
const locale = useQuireKitLocale();
const bounds = computed(() => ({
  ...(props.min === undefined ? {} : { min: props.min }),
  ...(props.max === undefined ? {} : { max: props.max })
}));
/** @param value - Public Select value; only string unit identities are accepted. */
function updateUnit(value: string | number | null | undefined): void {
  if (typeof value === "string") emit("update:unit", value);
}
</script>
<template>
  <QuireSpace class="qk-input-number-unit" block :wrap="false" gap="inlineTight"
    role="group" :aria-label="label" :style="{ width }">
    <QuireInputNumber v-bind="{ ...attrs, ...bounds }" width="100%" style="flex: 1 1 0; min-width: 0"
      :label="label" :model-value="modelValue !== null && Number.isFinite(modelValue) ? String(modelValue) : ''"
      :size="size" :disabled="disabled" :invalid="invalid" :step="step"
      :format-options="{ maximumFractionDigits: precision }"
      @value-change="emit('update:modelValue', Number.isFinite($event.valueAsNumber) ? $event.valueAsNumber : null)" />
    <!-- A compound field needs a separate Ark field identity for its hidden select. -->
    <Field.Root as-child :disabled="disabled">
    <QuireSelect :width="unitWidth" style="flex: 0 0 auto" :size="size"
      :label="unitLabel" :model-value="unit" :items="units" :disabled="disabled"
      :content-props="{ lang: locale }" @update:model-value="updateUnit" />
    </Field.Root>
  </QuireSpace>
</template>
