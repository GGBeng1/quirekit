<script setup lang="ts">
import { Checkbox } from "@ark-ui/vue/checkbox";
import { computed, useId } from "vue";
import type {
  QuireKitCheckboxSize,
  QuireKitCheckboxState
} from "../../components/checkbox";
import QuireIcon from "../icon/icon.vue";

/** Vue Checkbox 的公开属性。 */
interface Props {
  /** 始终可见并参与点击目标的标签。 */
  readonly label: string;
  /** 未受控使用时的初始状态。 */
  readonly defaultChecked?: QuireKitCheckboxState;
  /** 原生表单字段名。 */
  readonly name?: string;
  /** 原生表单提交值。 */
  readonly value?: string;
  /** 关联的 form id。 */
  readonly form?: string;
  /** 标签下方的补充说明。 */
  readonly description?: string;
  /** 控件与文字的公开尺寸。 */
  readonly size?: QuireKitCheckboxSize;
  /** 是否禁用交互并退出原生表单提交。 */
  readonly disabled?: boolean;
  /** 是否允许聚焦与读取但禁止修改。 */
  readonly readOnly?: boolean;
  /** 是否为必填字段。 */
  readonly required?: boolean;
  /** 是否处于校验错误状态。 */
  readonly invalid?: boolean;
}

/** Checkbox 的可替换文字内容。 */
interface Slots {
  /** 替换可见标签，保留标签关联与点击行为。 */
  readonly default?: () => unknown;
  /** 替换补充说明。 */
  readonly description?: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  defaultChecked: false,
  size: "sm",
  disabled: false,
  readOnly: false,
  required: false,
  invalid: false
});
// Preserve absence so the uncontrolled default is not replaced by Boolean prop casting.
const checked = defineModel<QuireKitCheckboxState | undefined>("checked", { default: undefined });
defineSlots<Slots>();

const generatedId = useId();
const descriptionId = computed(() => `qk-checkbox-${generatedId}-description`);
const optionalRootProps = computed(() => ({
  ...(checked.value === undefined ? {} : { checked: checked.value }),
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.value === undefined ? {} : { value: props.value }),
  ...(props.form === undefined ? {} : { form: props.form })
}));
const currentChecked = computed(() => checked.value ?? props.defaultChecked);

/**
 * 把 Ark 的下一状态同步给可选的 v-model。
 *
 * @param value - 用户交互后产生的 checked 状态。
 */
function updateChecked(value: QuireKitCheckboxState): void {
  checked.value = value;
}
</script>

<template>
  <Checkbox.Root
    v-bind="optionalRootProps"
    :default-checked="defaultChecked"
    :disabled="disabled"
    :read-only="readOnly"
    :required="required"
    :invalid="invalid"
    :class="[
      'qk-checkbox',
      `qk-checkbox--${size}`,
      invalid && 'qk-checkbox--invalid',
      disabled && 'qk-checkbox--disabled'
    ]"
    @update:checked="updateChecked"
  >
    <Checkbox.HiddenInput
      :aria-describedby="description === undefined && !$slots.description ? undefined : descriptionId"
      :aria-checked="currentChecked === 'indeterminate' ? 'mixed' : undefined"
      :indeterminate="currentChecked === 'indeterminate'"
    />
    <Checkbox.Control :class="['qk-checkbox__control', `qk-checkbox__control--${size}`]">
      <Checkbox.Indicator class="qk-checkbox__indicator">
        <QuireIcon name="check" :size="12" />
      </Checkbox.Indicator>
      <Checkbox.Indicator indeterminate class="qk-checkbox__indicator">
        <span aria-hidden="true" class="qk-checkbox__mixed-mark" />
      </Checkbox.Indicator>
    </Checkbox.Control>
    <span class="qk-checkbox__content">
      <Checkbox.Label class="qk-checkbox__label">
        <slot>{{ label }}</slot>
        <span v-if="required" aria-hidden="true" class="qk-checkbox__required">*</span>
      </Checkbox.Label>
      <span
        v-if="description !== undefined || $slots.description"
        :id="descriptionId"
        class="qk-checkbox__description"
      >
        <slot name="description">{{ description }}</slot>
      </span>
    </span>
  </Checkbox.Root>
</template>
