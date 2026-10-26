<script setup lang="ts">
import { Field } from "@ark-ui/vue/field";
import type { UseFieldContext } from "@ark-ui/vue/field";
import { computed } from "vue";
import type { UnwrapRef } from "vue";
import type {
  QuireKitFieldControlProps,
  QuireKitFieldSlotProps,
  QuireKitFieldStatus
} from "../../components/field/types";
import { useQuireKitMessages } from "../locale-provider/context";
import { provideFieldLabel } from "./context";

/** 标签、单个输入控件和单条反馈的组合属性。 */
interface Props {
  /** 始终可见的字段标签。 */
  readonly label: string;
  /** 控件与标签共享的稳定 id。 */
  readonly id?: string;
  /** Explicit native control identity for an existing form; takes precedence over id. */
  readonly controlId?: string;
  /** 默认状态下的必要说明。 */
  readonly description?: string;
  /** 校验失败时的恢复说明；省略时使用语言包的通用提示。 */
  readonly errorText?: string;
  /** 控件禁用时解释不可用原因。 */
  readonly disabledReason?: string;
  /** 多值不一致时的反馈文本；省略时使用语言包的通用提示。 */
  readonly mixedText?: string;
  /** 后台更新时的反馈文本；省略时使用语言包的通用提示。 */
  readonly busyText?: string;
  /** Field 接受的 CSS 宽度，默认占满父容器。 */
  readonly width?: string | number;
  /** 是否为必填项。 */
  readonly required?: boolean;
  /** 是否处于校验错误状态。 */
  readonly invalid?: boolean;
  /** 是否禁用输入。 */
  readonly disabled?: boolean;
  /** 是否只读。 */
  readonly readOnly?: boolean;
  /** 是否正在提交或同步；仅显示状态，限制修改需同时配置只读或禁用。 */
  readonly busy?: boolean;
  /** 是否表示多个不同值。 */
  readonly mixed?: boolean;
}

/** Field 的可替换内容位置。 */
interface Slots {
  /** 唯一输入控件；必须把 controlProps 绑定到控件。 */
  readonly default: (props: QuireKitFieldSlotProps) => unknown;
  /** 标签右侧的短元信息或局部动作。 */
  readonly meta?: () => unknown;
  /** 替换当前唯一反馈文本。 */
  readonly message?: (props: { readonly status: QuireKitFieldStatus }) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  width: "100%",
  required: false,
  invalid: false,
  disabled: false,
  readOnly: false,
  busy: false,
  mixed: false
});
defineSlots<Slots>();
const text = useQuireKitMessages("field");
provideFieldLabel(() => props.label);

const rootStyle = computed(() => ({ width: props.width }));
const optionalRootBindings = computed(() => {
  // Ark uses id for the native input; ids.control identifies its enclosing root.
  // Keep one native identity so labels and custom consumer references agree.
  const id = props.controlId ?? props.id;
  return id === undefined ? {} : { id };
});
const status = computed<QuireKitFieldStatus | undefined>(() => {
  if (props.invalid) return "error";
  if (props.busy) return "busy";
  if (props.disabled && props.disabledReason !== undefined) return "disabled";
  if (props.mixed) return "mixed";
  if (props.description !== undefined) return "description";
  return undefined;
});
const message = computed(() => {
  switch (status.value) {
    case "error": return props.errorText ?? text.value.invalid;
    case "busy": return props.busyText ?? text.value.busy;
    case "disabled": return props.disabledReason;
    case "mixed": return props.mixedText ?? text.value.mixed;
    case "description": return props.description;
    default: return undefined;
  }
});

/**
 * 把 Ark Field 上下文投影为 QuireKit 输入组件可直接绑定的合同。
 *
 * @param field - 当前 Field Root 提供的 Ark 上下文。
 * @returns 包含 id、状态和反馈关联的输入属性。
 */
function controlProps(field: UnwrapRef<UseFieldContext>): QuireKitFieldControlProps {
  return {
    ...field.getInputProps(),
    width: "100%",
    required: props.required,
    disabled: props.disabled,
    readOnly: props.readOnly,
    invalid: props.invalid
  };
}
</script>

<template>
  <Field.Root
    v-bind="optionalRootBindings"
    :required="required"
    :invalid="invalid"
    :disabled="disabled"
    :read-only="readOnly"
    :style="rootStyle"
    :aria-busy="busy || undefined"
    :class="[
      'qk-field',
      invalid && 'qk-field--invalid',
      disabled && 'qk-field--disabled',
      mixed && 'qk-field--mixed',
      busy && 'qk-field--busy'
    ]"
  >
    <span class="qk-field__header">
      <Field.Label class="qk-field__label">
        {{ label }}
        <Field.RequiredIndicator v-if="required" class="qk-field__required">*</Field.RequiredIndicator>
      </Field.Label>
      <span v-if="$slots.meta" class="qk-field__meta"><slot name="meta" /></span>
    </span>

    <Field.Context v-slot="field">
      <slot :control-props="controlProps(field)" :status="status" />
    </Field.Context>

    <Field.ErrorText v-if="status === 'error'" class="qk-field__message qk-field__message--error">
      <slot name="message" status="error">{{ message }}</slot>
    </Field.ErrorText>
    <Field.HelperText v-else-if="status" :class="['qk-field__message', `qk-field__message--${status}`]">
      <span v-if="status === 'busy'" aria-hidden="true" class="qk-field__busy-indicator" />
      <slot name="message" :status="status">{{ message }}</slot>
    </Field.HelperText>
  </Field.Root>
</template>
