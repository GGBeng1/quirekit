<script setup lang="ts">
import { Switch } from "@ark-ui/vue/switch";
import { computed, useId } from "vue";
import type { QuireKitSwitchSize } from "../../components/switch";

/** Vue Switch 的公开属性。 */
interface Props {
  /** 始终可见并参与点击目标的标签。 */
  readonly label: string;
  /** 未受控使用时的初始状态。 */
  readonly defaultChecked?: boolean;
  /** 原生表单字段名。 */
  readonly name?: string;
  /** 原生表单提交值。 */
  readonly value?: string;
  /** 关联的 form id。 */
  readonly form?: string;
  /** 标签下方的补充说明。 */
  readonly description?: string;
  /** 轨道、拇指与文字的公开尺寸。 */
  readonly size?: QuireKitSwitchSize;
  /** 是否禁用交互与原生提交。 */
  readonly disabled?: boolean;
  /** 是否允许聚焦与读取但禁止修改。 */
  readonly readOnly?: boolean;
  /** 是否为必填字段。 */
  readonly required?: boolean;
  /** 是否处于校验错误状态。 */
  readonly invalid?: boolean;
}

/** Switch 的可替换文字内容。 */
interface Slots {
  /** 替换可见标签。 */
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
const checked = defineModel<boolean | undefined>("checked", { default: undefined });
defineSlots<Slots>();

const generatedId = useId();
const descriptionId = computed(() => `qk-switch-${generatedId}-description`);
const optionalRootProps = computed(() => ({
  ...(checked.value === undefined ? {} : { checked: checked.value }),
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.value === undefined ? {} : { value: props.value }),
  ...(props.form === undefined ? {} : { form: props.form })
}));

/**
 * 把 Ark 的下一状态同步给可选的 v-model。
 *
 * @param value - 用户交互后的布尔状态。
 */
function updateChecked(value: boolean): void {
  checked.value = value;
}
</script>

<template>
  <Switch.Root
    v-bind="optionalRootProps"
    :default-checked="defaultChecked"
    :disabled="disabled"
    :read-only="readOnly"
    :required="required"
    :invalid="invalid"
    :class="[
      'qk-switch',
      `qk-switch--${size}`,
      invalid && 'qk-switch--invalid',
      disabled && 'qk-switch--disabled',
      (description !== undefined || $slots.description) && 'qk-switch--described'
    ]"
    @update:checked="updateChecked"
  >
    <Switch.HiddenInput
      role="switch"
      :aria-describedby="description === undefined && !$slots.description ? undefined : descriptionId"
    />
    <span class="qk-switch__content">
      <Switch.Label class="qk-switch__label">
        <slot>{{ label }}</slot>
        <span v-if="required" aria-hidden="true" class="qk-switch__required">*</span>
      </Switch.Label>
      <span
        v-if="description !== undefined || $slots.description"
        :id="descriptionId"
        class="qk-switch__description"
      >
        <slot name="description">{{ description }}</slot>
      </span>
    </span>
    <Switch.Control :class="['qk-switch__control', `qk-switch__control--${size}`]">
      <Switch.Thumb :class="['qk-switch__thumb', `qk-switch__thumb--${size}`]" />
    </Switch.Control>
  </Switch.Root>
</template>
