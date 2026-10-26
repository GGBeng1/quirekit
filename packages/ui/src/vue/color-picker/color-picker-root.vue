<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import { ColorPicker } from "@ark-ui/vue/color-picker";
import type {
  ColorPickerColorFormat,
  ColorPickerOpenChangeDetails,
  ColorPickerRootProps,
  ColorPickerValueChangeDetails
} from "@ark-ui/vue/color-picker";
import { computed, ref, shallowRef, watch } from "vue";
import type { QuireKitColorPickerPlacement } from "../../components/color-picker";
import {
  parseQuireColor,
  serializeQuireColor
} from "../../components/color-picker";

/** Color Picker 的公开属性。 */
interface Props {
  /** 受控 CSS 颜色字符串。 */
  readonly modelValue?: string;
  /** 非受控模式的初始 CSS 颜色字符串。 */
  readonly defaultValue?: string;
  /** 受控浮层打开状态。 */
  readonly open?: boolean;
  /** 非受控模式的初始打开状态。 */
  readonly defaultOpen?: boolean;
  /** 用于颜色运算的颜色空间；输入显示格式由 Editor 配置。 */
  readonly format?: ColorPickerColorFormat;
  /** 初始颜色空间。 */
  readonly defaultFormat?: ColorPickerColorFormat;
  /** 选择快捷色后是否关闭浮层。 */
  readonly closeOnSelect?: boolean;
  /** 是否禁用所有颜色交互。 */
  readonly disabled?: boolean;
  /** 是否只读。 */
  readonly readOnly?: boolean;
  /** 是否使用行内模式呈现。 */
  readonly inline?: boolean;
  /** 浮层相对触发器的首选方位。 */
  readonly placement?: QuireKitColorPickerPlacement;
  /** 隐藏表单输入的字段名。 */
  readonly name?: string;
}

/** Color Picker machine 适配器的公开事件。 */
interface Emits {
  /** 同步受控 CSS 颜色字符串。 */
  "update:modelValue": [value: string];
  /** 同步受控浮层状态。 */
  "update:open": [open: boolean];
  /** 颜色拖动或输入期间的连续预览事件。 */
  valueChange: [value: string];
  /** 一次颜色交互结束后的稳定值事件。 */
  valueChangeEnd: [value: string];
  /** 浮层打开状态变化事件。 */
  openChange: [open: boolean];
}

/** Root 内部各可组合部件。 */
interface Slots {
  /** 颜色触发器、快捷色板、精确编辑器或自定义内容。 */
  readonly default: () => unknown;
}

// 显式保留 undefined，避免 Vue 把缺省 Boolean prop 强制转换为 false 并误入受控模式。
const portal = useQuireOverlayHost();
const props = withDefaults(defineProps<Props>(), {
  open: undefined as never,
  defaultValue: "#1677FF",
  defaultOpen: false,
  defaultFormat: "hsba",
  closeOnSelect: false,
  disabled: false,
  readOnly: false,
  inline: false,
  placement: "bottom-start"
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();

const internalOpen = ref(props.open ?? props.defaultOpen);
const controlledColor = shallowRef(parseQuireColor(props.modelValue ?? props.defaultValue));

watch(() => props.modelValue, (value) => {
  if (value === undefined) return;

  const nextColor = parseQuireColor(value);
  // 受控父组件通常会把刚发出的 HEX/HEXA 原样回写。无彩色 HEX 不携带 Hue，
  // 因此相同可见颜色必须继续使用 machine 中的 Color 对象，保留最后一个有效色相。
  if (serializeQuireColor(nextColor) === serializeQuireColor(controlledColor.value)) return;
  controlledColor.value = nextColor;
}, { flush: "sync" });

const rootBindings = computed<ColorPickerRootProps>(() => ({
  defaultValue: parseQuireColor(props.defaultValue),
  defaultFormat: props.defaultFormat,
  closeOnSelect: props.closeOnSelect,
  disabled: props.disabled,
  readOnly: props.readOnly,
  inline: props.inline,
  positioning: {
    // Keep expanding floating content in viewport coordinates without growing page scroll bounds.
    strategy: portal.strategy.value ?? "fixed",
    placement: props.placement,
    gutter: 6,
    flip: true,
    slide: true,
    hideWhenDetached: true
  },
  ...(props.modelValue === undefined
    ? {}
    : { modelValue: controlledColor.value }),
  // The local fallback already consumes defaultOpen once; only effective open reaches Zag.
  open: props.open ?? internalOpen.value,
  ...(props.format === undefined ? {} : { format: props.format }),
  ...(props.name === undefined ? {} : { name: props.name })
}));

/**
 * 同步 Ark 的受控颜色对象到字符串公共合同。
 *
 * @param value - Ark machine 返回的颜色对象。
 */
function handleModelValue(value: Parameters<typeof serializeQuireColor>[0]): void {
  if (props.modelValue !== undefined) controlledColor.value = value;
  emit("update:modelValue", serializeQuireColor(value));
}

/**
 * 转发连续颜色预览。
 *
 * @param details - Ark machine 的颜色变化明细。
 */
function handleValueChange(details: ColorPickerValueChangeDetails): void {
  emit("valueChange", serializeQuireColor(details.value));
}

/**
 * 转发稳定颜色值。
 *
 * @param details - Ark machine 的交互结束明细。
 */
function handleValueChangeEnd(details: ColorPickerValueChangeDetails): void {
  emit("valueChangeEnd", serializeQuireColor(details.value));
}

/**
 * 同步 Ark 浮层生命周期。
 *
 * @param details - Ark machine 的打开状态明细。
 */
function handleOpenChange(details: ColorPickerOpenChangeDetails): void {
  internalOpen.value = details.open;
  emit("update:open", details.open);
  emit("openChange", details.open);
}
</script>

<template>
  <ColorPicker.Root
    v-bind="rootBindings"
    data-qk-scope="color-picker"
    lazy-mount
    unmount-on-exit
    @update:model-value="handleModelValue"
    @value-change="handleValueChange"
    @value-change-end="handleValueChangeEnd"
    @open-change="handleOpenChange"
  >
    <slot />
  </ColorPicker.Root>
</template>
