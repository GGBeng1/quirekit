<script setup lang="ts">
import { RadioGroup } from "@ark-ui/vue/radio-group";
import { computed, useId } from "vue";
import { guardRadioReadOnlyKey } from "./keyboard";
import type {
  QuireKitRadioGroupItem,
  QuireKitRadioGroupOrientation,
  QuireKitRadioGroupSize
} from "../../components/radio-group";

/** Vue RadioGroup 的公开属性。 */
interface Props {
  /** radiogroup 的可访问标签，默认可见。 */
  readonly label: string;
  /** 隐藏可见标题，仍保留读屏标签关联。 */
  readonly hideLabel?: boolean;
  /** 按 DOM 顺序渲染的稳定选项。 */
  readonly items: readonly QuireKitRadioGroupItem[];
  /** 未受控使用时的初始值。 */
  readonly defaultValue?: string | null;
  /** 原生 radio 共享的表单字段名。 */
  readonly name?: string;
  /** 关联的 form id。 */
  readonly form?: string;
  /** 选项排列和可访问方向；方向键遵循原生 radio 行为。 */
  readonly orientation?: QuireKitRadioGroupOrientation;
  /** 控件与文字的公开尺寸。 */
  readonly size?: QuireKitRadioGroupSize;
  /** 是否禁用整组。 */
  readonly disabled?: boolean;
  /** 是否允许聚焦与读取但禁止修改。 */
  readonly readOnly?: boolean;
  /** 是否要求选中一项。 */
  readonly required?: boolean;
  /** 是否处于校验错误状态。 */
  readonly invalid?: boolean;
}

/** 自定义 radio 内容时获得的稳定上下文。 */
interface ItemSlotProps {
  /** 当前渲染的选项。 */
  readonly item: QuireKitRadioGroupItem;
  /** 当前选项是否已选中。 */
  readonly selected: boolean;
}

/** RadioGroup 的可替换内容位置。 */
interface Slots {
  /** 替换一个选项的可见内容。 */
  readonly item?: (props: ItemSlotProps) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: null,
  hideLabel: false,
  orientation: "vertical",
  size: "sm",
  disabled: false,
  readOnly: false,
  required: false,
  invalid: false
});
const selectedValue = defineModel<string | null>();
defineSlots<Slots>();

const generatedId = useId();
const currentValue = computed(() => selectedValue.value ?? props.defaultValue);
const optionalRootProps = computed(() => ({
  ...(selectedValue.value === undefined ? {} : { modelValue: selectedValue.value }),
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.form === undefined ? {} : { form: props.form })
}));

/**
 * 返回当前选项说明的稳定 DOM id。
 *
 * @param item - 当前 radio 选项。
 * @returns 可供原生 input 引用的说明 id。
 */
function descriptionId(item: QuireKitRadioGroupItem): string {
  return `qk-radio-${generatedId}-${item.value}-description`;
}

/**
 * 把 Ark 的下一值同步给可选的 v-model。
 *
 * @param value - 用户交互后选中的值。
 */
function updateValue(value: string | null): void {
  selectedValue.value = value;
}
</script>

<template>
  <RadioGroup.Root
    v-bind="optionalRootProps"
    :default-value="defaultValue"
    :orientation="orientation"
    :disabled="disabled"
    :read-only="readOnly"
    :required="required"
    :invalid="invalid"
    :class="[
      'qk-radio-group',
      `qk-radio-group--${orientation}`,
      `qk-radio-group--${size}`,
      invalid && 'qk-radio-group--invalid',
      disabled && 'qk-radio-group--disabled'
    ]"
    @update:model-value="updateValue"
    @keydown.capture="guardRadioReadOnlyKey($event, readOnly)"
  >
    <RadioGroup.Label :class="['qk-radio-group__label', hideLabel && 'sr-only']">
      {{ label }}<span v-if="required" aria-hidden="true" class="qk-radio-group__required">*</span>
    </RadioGroup.Label>
    <span :class="['qk-radio-group__items', `qk-radio-group__items--${orientation}`]">
      <RadioGroup.Item
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        :disabled="item.disabled"
        :class="['qk-radio-group__item', `qk-radio-group__item--${size}`]"
      >
        <RadioGroup.ItemContext v-slot="itemState">
          <RadioGroup.ItemHiddenInput
            :disabled="itemState.disabled"
            :aria-describedby="item.description === undefined ? undefined : descriptionId(item)"
          />
        </RadioGroup.ItemContext>
        <RadioGroup.ItemControl :class="['qk-radio-group__control', `qk-radio-group__control--${size}`]">
          <span
            aria-hidden="true"
            :class="[
              'qk-radio-group__mark',
              currentValue === item.value && 'qk-radio-group__mark--selected'
            ]"
          />
        </RadioGroup.ItemControl>
        <span class="qk-radio-group__content">
          <RadioGroup.ItemText class="qk-radio-group__item-label">
            <slot name="item" :item="item" :selected="currentValue === item.value">
              {{ item.label }}
            </slot>
          </RadioGroup.ItemText>
          <span
            v-if="item.description !== undefined"
            :id="descriptionId(item)"
            class="qk-radio-group__description"
          >{{ item.description }}</span>
        </span>
      </RadioGroup.Item>
    </span>
  </RadioGroup.Root>
</template>
