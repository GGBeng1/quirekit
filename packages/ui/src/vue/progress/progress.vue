<script setup lang="ts">
import { Progress } from "@ark-ui/vue/progress";
import type { UseProgressReturn } from "@ark-ui/vue/progress";
import { computed } from "vue";
import type { QuireKitProgressSlotProps, QuireKitProgressValueChangeDetails } from "../../components/progress";
import { normalizeProgressRange, normalizeProgressValue } from "../../components/progress/normalize";
import { useQuireKitLocale, useQuireKitMessages } from "../locale-provider/context";
import type { QuireProgressEmits, QuireProgressProps, QuireProgressSlots } from "./types";

const props = withDefaults(defineProps<QuireProgressProps>(), {
  min: 0,
  max: 100,
  formatOptions: () => ({ style: "percent" }),
  shape: "linear",
  size: "md",
  tone: "primary",
  showLabel: undefined,
  showValue: undefined
});
const modelValue = defineModel<number | null | undefined>();
const emit = defineEmits<QuireProgressEmits>();
defineSlots<QuireProgressSlots>();
const text = useQuireKitMessages("progress");
const locale = useQuireKitLocale();

// Preserve the initial task value before projecting changing bounds into Ark.
// Clipping a presentation must never replace the consumer's original progress.
const initialValue = props.defaultValue !== undefined ? props.defaultValue : props.shape === "spinner" ? null : 0;
const range = computed(() => normalizeProgressRange(props.min, props.max));
const value = computed(() => normalizeProgressValue(
  modelValue.value === undefined ? initialValue : modelValue.value,
  range.value.min,
  range.value.max
));
const labelVisible = computed(() => props.showLabel ?? props.shape !== "spinner");
const valueVisible = computed(() => props.showValue ?? props.shape !== "spinner");

/**
 * 为可见文本、插槽和辅助技术提供同一格式化结果。
 *
 * @param progress - Ark 提供的进度上下文。
 * @returns 不确定状态文案或 Intl 格式化数值。
 */
function valueText(progress: UseProgressReturn["value"]): string {
  return progress.indeterminate ? text.value.indeterminate : progress.valueAsString;
}

/**
 * 将 Ark 上下文投影为稳定的公共插槽数据。
 *
 * @param progress - Ark 提供的进度上下文。
 * @returns 有效数值、比例及统一文本。
 */
function slotProps(progress: UseProgressReturn["value"]): QuireKitProgressSlotProps {
  return {
    value: progress.value,
    percent: progress.indeterminate ? 0 : progress.percent,
    valueText: valueText(progress),
    indeterminate: progress.indeterminate
  };
}

/**
 * 同步状态机主动产生的变化；属性更新不会回写。
 *
 * @param details - Ark 报告的新数值。
 */
function handleValueChange(details: QuireKitProgressValueChangeDetails): void {
  modelValue.value = details.value;
  emit("valueChange", details);
}
</script>

<template>
  <Progress.Root
    :model-value="value"
    :min="range.min"
    :max="range.max"
    :locale="locale"
    :format-options="formatOptions"
    :class="['qk-progress', `qk-progress--${shape}`, `qk-progress--${size}`, `qk-progress--${tone}`]"
    @value-change="handleValueChange"
  >
    <Progress.Context v-slot="progress">
      <template v-if="shape === 'linear'">
        <div :class="['qk-progress__header', { 'qk-progress__label--hidden': !labelVisible && !valueVisible }]">
          <Progress.Label :class="['qk-progress__label', { 'qk-progress__label--hidden': !labelVisible }]">
            <slot name="label" v-bind="slotProps(progress)">{{ label }}</slot>
          </Progress.Label>
          <Progress.ValueText v-if="valueVisible" class="qk-progress__value">
            <slot name="value" v-bind="slotProps(progress)">{{ valueText(progress) }}</slot>
          </Progress.ValueText>
        </div>
        <Progress.Track
          :aria-labelledby="progress.getLabelProps().id"
          :aria-valuetext="valueText(progress)"
          class="qk-progress__track"
        >
          <Progress.Range class="qk-progress__range" />
        </Progress.Track>
      </template>

      <template v-else>
        <div class="qk-progress__circle-wrap">
          <Progress.Circle
            :aria-labelledby="progress.getLabelProps().id"
            :aria-valuetext="valueText(progress)"
            class="qk-progress__circle"
          >
            <Progress.CircleTrack class="qk-progress__circle-track" />
            <Progress.CircleRange
              :opacity="!progress.indeterminate && progress.percent === 0 ? 0 : 1"
              class="qk-progress__circle-range"
            />
          </Progress.Circle>
          <Progress.ValueText v-if="valueVisible && shape === 'circle'" class="qk-progress__circle-value" :title="valueText(progress)">
            <slot name="value" v-bind="slotProps(progress)">{{ valueText(progress) }}</slot>
          </Progress.ValueText>
        </div>
        <Progress.Label :class="[shape === 'circle' ? 'qk-progress__circle-label' : 'qk-progress__label', { 'qk-progress__label--hidden': !labelVisible }]">
          <slot name="label" v-bind="slotProps(progress)">{{ label }}</slot>
        </Progress.Label>
        <Progress.ValueText v-if="valueVisible && shape === 'spinner'" class="qk-progress__value">
          <slot name="value" v-bind="slotProps(progress)">{{ valueText(progress) }}</slot>
        </Progress.ValueText>
      </template>
    </Progress.Context>
  </Progress.Root>
</template>
