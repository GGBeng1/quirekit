<script setup lang="ts">
import { NumberInput } from "@ark-ui/vue/number-input";
import type {
  NumberInputFocusChangeDetails,
  NumberInputValueChangeDetails,
  NumberInputValueInvalidDetails
} from "@ark-ui/vue/number-input";
import { computed, ref, useAttrs, watch } from "vue";
import type {
  QuireKitNumberInputProps,
  QuireKitNumberInputFocusChange,
  QuireKitNumberInputValueChange,
  QuireKitNumberInputValueInvalid
} from "../../components/input-number";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitLocale, useQuireKitMessages } from "../locale-provider/context";
import { useFieldLabel } from "../field/context";

defineOptions({ inheritAttrs: false });

/** InputNumber 的公开事件。 */
interface Emits {
  /** 同步受控的本地化数值字符串。 */
  "update:modelValue": [value: string];
  /** 数值变化及数值投影。 */
  valueChange: [details: QuireKitNumberInputValueChange];
  /** 焦点变化及当时数值。 */
  focusChange: [details: QuireKitNumberInputFocusChange];
  /** 数值违反范围约束。 */
  valueInvalid: [details: QuireKitNumberInputValueInvalid];
}

const props = withDefaults(defineProps<QuireKitNumberInputProps>(), {
  defaultValue: "",
  size: "sm",
  width: "160px",
  allowMouseWheel: false,
  allowOverflow: true,
  clampValueOnBlur: true,
  focusInputOnChange: true,
  inputMode: "decimal",
  invalid: false,
  readOnly: false,
  required: false,
  spinOnPress: true,
  step: 1,
  disabled: false
});
const emit = defineEmits<Emits>();
const attrs = useAttrs();
const text = useQuireKitMessages("inputNumber");
const locale = useQuireKitLocale();
const rootAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([name]) => !name.startsWith("aria-"))
));
const inputAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([name]) => name.startsWith("aria-"))
));
const inputLabel = computed(() => typeof attrs["aria-label"] === "string" ? attrs["aria-label"] : props.label);
const fieldLabel = useFieldLabel();
const emptyHint = computed(() => {
  const label = inputLabel.value || fieldLabel.value;
  return props.placeholder ?? (label ? text.value.fieldPlaceholder(label) : text.value.placeholder);
});
const internalValue = ref(props.modelValue ?? props.defaultValue);
const currentValue = computed(() => props.modelValue ?? internalValue.value);
const rootStyle = computed(() => ({ width: props.width }));
const optionalBindings = computed(() => ({
  ...(props.form === undefined ? {} : { form: props.form }),
  ...(props.formatOptions === undefined ? {} : { formatOptions: props.formatOptions }),
  ...(props.id === undefined ? {} : { id: props.id }),
  ...(props.ids === undefined ? {} : { ids: props.ids }),
  ...(props.largeStep === undefined ? {} : { largeStep: props.largeStep }),
  ...(props.max === undefined ? {} : { max: props.max }),
  ...(props.min === undefined ? {} : { min: props.min }),
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.pattern === undefined ? {} : { pattern: props.pattern }),
  ...(props.smallStep === undefined ? {} : { smallStep: props.smallStep }),
  translations: {
    incrementLabel: text.value.increment(props.label),
    decrementLabel: text.value.decrement(props.label)
  }
}));

watch(() => props.modelValue, (value) => {
  if (value !== undefined) internalValue.value = value;
});

/**
 * 同步 Ark 的字符串模型。
 *
 * @param value - Ark Number Input 返回的本地化字符串。
 */
function updateValue(value: string): void {
  internalValue.value = value;
  emit("update:modelValue", value);
}

/**
 * 投影稳定的值变化详情。
 *
 * @param details - Ark Number Input 值变化详情。
 */
function emitValueChange(details: NumberInputValueChangeDetails): void {
  emit("valueChange", { value: details.value, valueAsNumber: details.valueAsNumber });
}

/**
 * 投影稳定的焦点变化详情。
 *
 * @param details - Ark Number Input 焦点变化详情。
 */
function emitFocusChange(details: NumberInputFocusChangeDetails): void {
  emit("focusChange", {
    value: details.value,
    valueAsNumber: details.valueAsNumber,
    focused: details.focused
  });
}

/**
 * 投影稳定的越界详情。
 *
 * @param details - Ark Number Input 越界详情。
 */
function emitValueInvalid(details: NumberInputValueInvalidDetails): void {
  emit("valueInvalid", {
    value: details.value,
    valueAsNumber: details.valueAsNumber,
    reason: details.reason
  });
}
</script>

<template>
  <NumberInput.Root
    v-bind="{ ...rootAttrs, ...optionalBindings }"
    :model-value="currentValue"
    :allow-mouse-wheel="allowMouseWheel"
    :allow-overflow="allowOverflow"
    :clamp-value-on-blur="clampValueOnBlur"
    :focus-input-on-change="focusInputOnChange"
    :input-mode="inputMode"
    :invalid="invalid"
    :locale="locale"
    :read-only="readOnly"
    :required="required"
    :spin-on-press="spinOnPress"
    :step="step"
    :disabled="disabled"
    :style="rootStyle"
    :class="[
      'qk-input-number',
      `qk-input-number--${size}`,
      invalid && 'qk-input-number--invalid'
    ]"
    @update:model-value="updateValue"
    @value-change="emitValueChange"
    @focus-change="emitFocusChange"
    @value-invalid="emitValueInvalid"
  >
    <NumberInput.Control
      :class="[
        'qk-input-number__control',
        'group',
        invalid && 'qk-input-number__control--invalid'
      ]"
    >
      <NumberInput.Input v-bind="inputAttrs" :placeholder="emptyHint" :aria-label="inputLabel" class="qk-input-number__input" />
      <span class="qk-input-number__stepper">
        <NumberInput.IncrementTrigger class="qk-input-number__stepper-button" tabindex="-1">
          <QuireIcon name="triangleUp" :size="12" />
        </NumberInput.IncrementTrigger>
        <NumberInput.DecrementTrigger class="qk-input-number__stepper-button" tabindex="-1">
          <QuireIcon name="triangleDown" :size="12" />
        </NumberInput.DecrementTrigger>
      </span>
    </NumberInput.Control>
  </NumberInput.Root>
</template>
