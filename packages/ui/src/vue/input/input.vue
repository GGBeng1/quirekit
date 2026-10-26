<script setup lang="ts">
import QuireButton from "../button/button.vue";
import QuireIcon from "../icon/icon.vue";
import { ark } from "@ark-ui/vue/factory";
import { computed, ref, useAttrs, watch } from "vue";
import type { QuireKitInputProps } from "../../components/input";
import { useQuireKitMessages } from "../locale-provider/context";
import PasswordField from "./password-field.vue";
import { useFieldLabel } from "../field/context";

defineOptions({ inheritAttrs: false });

const ArkInput = ark.input;

/** 文本 Input 的公开事件。 */
interface Emits {
  /** 请求更新密码可见性，不改变输入值。 */
  "update:visible": [visible: boolean];
  /** 同步受控文本值。 */
  "update:modelValue": [value: string];
  /** 输入过程中同步最新文本值。 */
  valueChange: [value: string];
  /** 原生 change 边界提交的文本值。 */
  change: [value: string];
  /** 输入获得焦点。 */
  focus: [event: FocusEvent];
  /** 输入失去焦点。 */
  blur: [event: FocusEvent];
}

/** Input 前后稳定内容位置。 */
interface Slots {
  /** 输入前的图标或短前缀。 */
  readonly leading?: () => unknown;
  /** 输入后的图标或短后缀。 */
  readonly trailing?: () => unknown;
}

const props = withDefaults(defineProps<QuireKitInputProps>(), {
  clearable: false,
  defaultValue: "",
  type: "text",
  visibilityToggle: true,
  visible: undefined,
  defaultVisible: false,
  size: "sm",
  width: "240px",
  textAlign: "start",
  disabled: false,
  invalid: false,
  required: false,
  readOnly: false
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const attrs = useAttrs();
const text = useQuireKitMessages("input");
const fieldLabel = useFieldLabel();
const emptyHint = computed(() => {
  const label = typeof attrs["aria-label"] === "string" ? attrs["aria-label"] : fieldLabel.value;
  return props.placeholder ?? (label ? text.value.fieldPlaceholder(label) : text.value.placeholder[props.type]);
});
const root = ref<HTMLElement>();
const internalValue = ref(props.modelValue ?? props.defaultValue);
const currentValue = computed(() => props.modelValue ?? internalValue.value);
const rootStyle = computed(() => [
  { width: props.width },
  attrs.style
]);
const rootClass = computed(() => attrs.class);
const inputAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([name]) => name !== "class" && name !== "style")
));
const passwordProps = computed(() => props.type === "password" ? {
  visibilityToggle: props.visibilityToggle,
  visible: props.visible,
  defaultVisible: props.defaultVisible,
  readOnly: props.readOnly,
  invalid: props.invalid
} : {});

watch(() => props.modelValue, (value) => {
  if (value !== undefined) internalValue.value = value;
});

/**
 * 同步输入过程中的文本值。
 *
 * @param event - 原生 input 事件。
 */
function updateValue(event: Event): void {
  const value = (event.currentTarget as HTMLInputElement).value;
  internalValue.value = value;
  emit("update:modelValue", value);
  emit("valueChange", value);
}

/**
 * 转发原生 change 边界的稳定文本值。
 *
 * @param event - 原生 change 事件。
 */
function commitValue(event: Event): void {
  emit("change", (event.currentTarget as HTMLInputElement).value);
}
/** Clears an editable value and returns focus to its native input. */
function clearValue(): void {
  if (props.disabled || props.readOnly) return;
  internalValue.value = "";
  emit("update:modelValue", "");
  emit("valueChange", "");
  root.value?.querySelector("input")?.focus();
}
</script>

<template>
  <span ref="root"
    :style="rootStyle"
    :class="[
      'qk-input',
      `qk-input--${size}`,
      invalid && 'qk-input--invalid',
      disabled && 'qk-input--disabled',
      rootClass
    ]"
  >
    <span v-if="$slots.leading" class="qk-input__adornment" data-slot="leading">
      <slot name="leading" />
    </span>
    <component
      :is="type === 'password' ? PasswordField : ArkInput"
      v-bind="{ ...inputAttrs, ...passwordProps }"
      :value="currentValue"
      :style="{ textAlign }"
      :type="type"
      :placeholder="emptyHint"
      :name="name"
      :form="form"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :required="required"
      :readonly="readOnly"
      :minlength="minlength"
      :maxlength="maxlength"
      :pattern="pattern"
      class="qk-input__field"
      @input="updateValue"
      @change="commitValue"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
      @update:visible="emit('update:visible', $event)"
    />
    <QuireButton v-if="clearable && currentValue && !disabled && !readOnly" variant="ghost" size="xs" :aria-label="text.clear" @pointerdown.prevent @click="clearValue">
      <QuireIcon name="close" :size="12" />
    </QuireButton>
    <span v-if="$slots.trailing" class="qk-input__adornment" data-slot="trailing">
      <slot name="trailing" />
    </span>
  </span>
</template>
