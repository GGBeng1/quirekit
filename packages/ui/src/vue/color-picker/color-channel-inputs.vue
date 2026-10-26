<script setup lang="ts">
import { ColorPicker, useColorPickerContext } from "@ark-ui/vue/color-picker";
import { computed } from "vue";
import type { QuireKitColorInputFormat } from "../../components/color-picker";
import QuireInputNumber from "../input-number/input-number.vue";
import { useQuireKitMessages } from "../locale-provider/context";

type NumericFormat = Exclude<QuireKitColorInputFormat, "hex">;
type NumericChannel = "red" | "green" | "blue" | "hue" | "saturation" | "lightness" | "brightness";

/** 单个颜色通道输入的稳定定义。 */
interface ChannelDefinition {
  /** Ark 颜色对象中的通道名称。 */
  readonly channel: NumericChannel;
  /** 紧凑输入上方的可见缩写。 */
  readonly label: string;
  /** 允许输入的最小值。 */
  readonly min: number;
  /** 允许输入的最大值。 */
  readonly max: number;
}

/** 带当前投影值的颜色通道输入。 */
interface ProjectedChannel extends ChannelDefinition {
  /** 当前颜色在目标颜色空间中的通道值。 */
  readonly value: number;
}

/** 颜色格式通道输入的公开属性。 */
interface Props {
  /** 当前显示的颜色输入格式。 */
  readonly format: QuireKitColorInputFormat;
}

const props = defineProps<Props>();
const text = useQuireKitMessages("colorPicker");
const picker = useColorPickerContext();
const inputState = computed(() => picker.value.getChannelInputProps({ channel: "hex" }));
const channelDefinitions: Record<NumericFormat, readonly ChannelDefinition[]> = {
  rgb: [
    { channel: "red", label: "R", min: 0, max: 255 },
    { channel: "green", label: "G", min: 0, max: 255 },
    { channel: "blue", label: "B", min: 0, max: 255 }
  ],
  hsl: [
    { channel: "hue", label: "H", min: 0, max: 360 },
    { channel: "saturation", label: "S", min: 0, max: 100 },
    { channel: "lightness", label: "L", min: 0, max: 100 }
  ],
  hsb: [
    { channel: "hue", label: "H", min: 0, max: 360 },
    { channel: "saturation", label: "S", min: 0, max: 100 },
    { channel: "brightness", label: "B", min: 0, max: 100 }
  ]
};
const machineFormats = { rgb: "rgba", hsl: "hsla", hsb: "hsba" } as const;
const projectedChannels = computed<readonly ProjectedChannel[]>(() => {
  if (props.format === "hex") return [];
  const color = picker.value.value.toFormat(machineFormats[props.format]);
  return channelDefinitions[props.format].map(definition => ({
    ...definition,
    value: Math.round(color.getChannelValue(definition.channel))
  }));
});

/**
 * Preserves a complete HEX draft even when closing a popup removes the focused
 * field without a blur event. Partial input still belongs to the native field;
 * Ark retains responsibility for Enter/blur normalization and final commits.
 * @param event - Native channel input, including composition ownership.
 */
function previewHex(event: InputEvent): void {
  if (event.isComposing || inputState.value.disabled || inputState.value.readonly) return;
  const value = (event.target as HTMLInputElement).value.trim();
  if (!/^#?(?:[\da-f]{6}|[\da-f]{8})$/iu.test(value)) return;
  picker.value.setValue(value.startsWith("#") ? value : `#${value}`);
}

/**
 * 把目标颜色空间的一个通道写回同一 Ark machine。
 *
 * @param channel - 要更新的目标颜色通道。
 * @param value - InputNumber 返回的本地化数值字符串。
 */
function updateChannel(channel: NumericChannel, value: string): void {
  if (props.format === "hex" || inputState.value.disabled || inputState.value.readonly) return;
  const parsedValue = Number.parseFloat(value);
  if (!Number.isFinite(parsedValue)) return;

  const values = Object.fromEntries(projectedChannels.value.map(item => [item.channel, item.value]));
  const definition = channelDefinitions[props.format].find(item => item.channel === channel);
  if (definition === undefined) return;
  values[channel] = Math.min(definition.max, Math.max(definition.min, parsedValue));
  const alpha = picker.value.alpha;

  if (props.format === "rgb") {
    picker.value.setValue(`rgba(${values.red}, ${values.green}, ${values.blue}, ${alpha})`);
  } else if (props.format === "hsl") {
    picker.value.setValue(`hsla(${values.hue}, ${values.saturation}%, ${values.lightness}%, ${alpha})`);
  } else {
    picker.value.setValue(`hsba(${values.hue}, ${values.saturation}%, ${values.brightness}%, ${alpha})`);
  }
}
</script>

<template>
  <ColorPicker.ChannelInput
    v-if="format === 'hex'"
    channel="hex"
    :aria-label="text.hexValue"
    class="qk-color-picker__input"
    @input="previewHex"
  />
  <div v-else class="qk-color-picker__channel-inputs">
    <label
      v-for="item in projectedChannels"
      :key="item.channel"
      class="qk-color-picker__input-group"
    >
      <span>{{ item.label }}</span>
      <QuireInputNumber
        :model-value="String(item.value)"
        :disabled="Boolean(inputState.disabled)"
        :read-only="Boolean(inputState.readonly)"
        :label="`${format.toUpperCase()} ${item.label}`"
        :min="item.min"
        :max="item.max"
        :step="1"
        size="md"
        width="100%"
        :data-channel="item.channel"
        @update:model-value="updateChannel(item.channel, $event)"
      />
    </label>
  </div>
</template>
