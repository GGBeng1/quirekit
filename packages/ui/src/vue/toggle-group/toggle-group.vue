<script setup lang="ts">
import { computed, shallowRef, useAttrs } from "vue";
import { ToggleGroup } from "@ark-ui/vue/toggle-group";
import type { QuireKitToggleGroupItem, QuireKitToggleGroupProps } from "../../components/toggle-group";
import { QuireButton } from "../button";
import { assertChoiceValues, useChoiceState } from "../shared/choice-state/model";
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const props = withDefaults(defineProps<QuireKitToggleGroupProps>(), { size: "sm", variant: "ghost", color: "primary", orientation: "horizontal", disabled: false, readOnly: false, invalid: false, multiple: false, deselectable: true, rovingFocus: true, loopFocus: true });
const emit = defineEmits<{
  /** Requested pressed values; single mode still uses a zero-or-one-item array. */
  "update:modelValue": [value: string[]];
}>();
defineSlots<{
  /** Replace visible action content, retaining its accessible label and pressed behavior. */
  item?: (context: { item: QuireKitToggleGroupItem; pressed: boolean }) => unknown;
}>();
const root = shallowRef<HTMLElement | null>(null);
const { values, update } = useChoiceState(props, value => emit("update:modelValue", value), root);
const choices = computed(() => { assertChoiceValues(props.items); return props.items; });
const pressed = computed(() => {
  const unique = [...new Set(values.value)];
  if (!props.multiple && unique.length > 1) throw new Error("QuireToggleGroup single mode accepts at most one value.");
  return unique;
});
const submitted = computed(() => choices.value.filter(item => !item.disabled && pressed.value.includes(item.value)));
</script>
<template>
  <div ref="root" class="qk-toggle-group-field">
    <ToggleGroup.Root v-bind="attrs" :model-value="pressed" :multiple="multiple" :deselectable="deselectable" :disabled="disabled" :orientation="orientation" :roving-focus="rovingFocus" :loop-focus="loopFocus" :aria-label="label" :aria-invalid="invalid || undefined" :data-readonly="readOnly ? '' : undefined" :style="columns ? { display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Math.floor(columns))}, minmax(0, 1fr))` } : undefined" :class="['qk-toggle-group', `qk-toggle-group--${orientation}`]" @update:model-value="update">
      <ToggleGroup.Item v-for="item in choices" :key="item.value" :value="item.value" :disabled="item.disabled" as-child>
        <QuireButton
          :size="size"
          :color="variant === 'outline' && pressed.includes(item.value) ? color : 'neutral'"
          :variant="variant === 'outline' ? 'outline' : pressed.includes(item.value) ? 'soft' : 'ghost'"
          :class="variant === 'outline' && pressed.includes(item.value) ? `qk-toggle-group__item--selected-${color}` : undefined"
          :disabled="disabled || item.disabled === true" :aria-label="item.label" :aria-disabled="readOnly || undefined"
        ><span class="qk-toggle-group__content"><slot name="item" :item="item" :pressed="pressed.includes(item.value)">{{ item.label }}</slot></span></QuireButton>
      </ToggleGroup.Item>
    </ToggleGroup.Root>
    <template v-if="name"><input v-for="item in submitted" :key="item.value" type="hidden" :name="name" :form="form" :value="item.value" :disabled="disabled"></template>
  </div>
</template>
