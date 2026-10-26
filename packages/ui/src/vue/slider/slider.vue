<script setup lang="ts">
import { Slider } from "@ark-ui/vue/slider";
import { computed } from "vue";
import type { QuireKitSliderOrientation, QuireKitSliderOrigin } from "../../components/slider";

/** Vue Slider 的公开属性。 */
interface Props {
  /** 控件始终可见的标签。 */
  readonly label: string;
  /** 每个拇指的可访问名称；范围选择时应逐项提供。 */
  readonly thumbLabels?: readonly string[];
  /** 未受控使用时的初始数值数组。 */
  readonly defaultValue?: number[];
  /** 最小值。 */
  readonly min?: number;
  /** 最大值。 */
  readonly max?: number;
  /** 每次键盘或指针调整的步长。 */
  readonly step?: number;
  /** PageUp、PageDown 或 Shift 调整时的大步长。 */
  readonly largeStep?: number;
  /** 多拇指之间允许的最小步数。 */
  readonly minStepsBetweenThumbs?: number;
  /** 布局和方向键轴向。 */
  readonly orientation?: QuireKitSliderOrientation;
  /** 填充区间从起点或中心延伸。 */
  readonly origin?: QuireKitSliderOrigin;
  /** 是否显示当前值文字。 */
  readonly showValue?: boolean;
  /** 当前值之后显示的单位。 */
  readonly unit?: string;
  /** 原生表单字段名。 */
  readonly name?: string;
  /** 关联的 form id。 */
  readonly form?: string;
  /** 是否禁用所有交互。 */
  readonly disabled?: boolean;
  /** 是否允许聚焦与读取但禁止修改。 */
  readonly readOnly?: boolean;
  /** 是否处于校验错误状态。 */
  readonly invalid?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: () => [0],
  min: 0,
  max: 100,
  step: 1,
  orientation: "horizontal",
  origin: "start",
  showValue: true,
  unit: "",
  disabled: false,
  readOnly: false,
  invalid: false
});
const values = defineModel<number[] | undefined>({ default: undefined });

const currentValues = computed(() => values.value ?? props.defaultValue);
const accessibleThumbLabels = computed(() => currentValues.value.map((_, index) => (
  props.thumbLabels?.[index] ?? (currentValues.value.length === 1 ? props.label : `${props.label} ${index + 1}`)
)));
const optionalRootProps = computed(() => ({
  ...(values.value === undefined ? {} : { modelValue: values.value }),
  ...(props.largeStep === undefined ? {} : { largeStep: props.largeStep }),
  ...(props.minStepsBetweenThumbs === undefined ? {} : { minStepsBetweenThumbs: props.minStepsBetweenThumbs }),
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.form === undefined ? {} : { form: props.form })
}));

/** 把 Ark 的下一数值数组同步给可选的 v-model。 */
function updateValues(nextValues: number[]): void {
  values.value = nextValues;
}
</script>

<template>
  <Slider.Root
    v-bind="optionalRootProps"
    :default-value="defaultValue"
    :min="min"
    :max="max"
    :step="step"
    :orientation="orientation"
    :origin="origin"
    :thumb-size="{ width: 16, height: 16 }"
    :disabled="disabled"
    :read-only="readOnly"
    :invalid="invalid"
    :class="['qk-slider', `qk-slider--${orientation}`]"
    @update:model-value="updateValues"
  >
    <div class="qk-slider__header">
      <span class="qk-slider__label">{{ label }}</span>
      <Slider.ValueText v-if="showValue" class="qk-slider__value">
        {{ currentValues.join(" – ") }}{{ unit }}
      </Slider.ValueText>
    </div>
    <Slider.Control :data-readonly="readOnly ? '' : undefined" class="qk-slider__control">
      <Slider.Track class="qk-slider__track">
        <Slider.Range class="qk-slider__range" />
      </Slider.Track>
      <Slider.Thumb
        v-for="(_, index) in currentValues"
        :key="index"
        :index="index"
        :aria-label="accessibleThumbLabels[index]"
        :aria-readonly="readOnly || undefined"
        :data-readonly="readOnly ? '' : undefined"
        class="qk-slider__thumb"
      >
        <Slider.HiddenInput :disabled="disabled" />
      </Slider.Thumb>
    </Slider.Control>
  </Slider.Root>
</template>
