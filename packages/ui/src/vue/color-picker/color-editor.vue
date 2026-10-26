<script setup lang="ts">
import { ColorPicker, useColorPickerContext } from "@ark-ui/vue/color-picker";
import { computed, onMounted, ref } from "vue";
import type { QuireKitColorInputFormat } from "../../components/color-picker";
import QuireColorChannelInputs from "./color-channel-inputs.vue";
import QuireIcon from "../icon/icon.vue";
import QuireInputNumber from "../input-number/input-number.vue";
import QuireSelect from "../select/select.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** 精确颜色编辑器的公开属性。 */
interface Props {
  /** 编辑器区域的可访问名称，说明本实例编辑的是什么颜色；缺省取语言包。 */
  readonly label?: string | undefined;
  /** 是否显示透明度轨道与透明度输入。 */
  readonly showAlpha?: boolean;
  /** 是否显示浏览器原生屏幕取色动作。 */
  readonly showEyedropper?: boolean;
  /** 是否显示返回快捷色板的动作。 */
  readonly showBack?: boolean;
  /** 文本输入区开放的格式。 */
  readonly inputFormats?: readonly QuireKitColorInputFormat[];
  /** 文本输入区初始格式。 */
  readonly defaultInputFormat?: QuireKitColorInputFormat;
}

/** 精确颜色编辑器的公开事件。 */
interface Emits {
  /** 用户请求返回快捷色板。 */
  back: [];
}

const props = withDefaults(defineProps<Props>(), {
  showAlpha: true,
  showEyedropper: true,
  showBack: false,
  inputFormats: () => ["hex", "rgb", "hsl", "hsb"],
  defaultInputFormat: "hex"
});
const emit = defineEmits<Emits>();
const text = useQuireKitMessages("colorPicker");
const picker = useColorPickerContext();
const inputState = computed(() => picker.value.getChannelInputProps({ channel: "hex" }));
const inputFormat = ref<QuireKitColorInputFormat>(props.defaultInputFormat);
const eyedropperSupported = ref(false);
const alphaValue = computed(() => picker.value.value.getChannelValue("alpha"));
const inputFormatItems = computed(() => props.inputFormats.map((format) => ({
  value: format,
  label: format.toUpperCase()
})));

onMounted(() => {
  eyedropperSupported.value = "EyeDropper" in window;
});

/**
 * 切换文本输入格式，不改变 Ark machine 的当前颜色空间或实际颜色。
 *
 * @param value - Select 提交的输入格式。
 */
function updateInputFormat(value: string | undefined): void {
  if (value !== undefined) inputFormat.value = value as QuireKitColorInputFormat;
}

/**
 * 把 InputNumber 的 0–1 数值写回 Ark alpha channel。
 *
 * @param value - InputNumber 返回的本地化数值字符串。
 */
function updateAlpha(value: string): void {
  if (inputState.value.disabled || inputState.value.readonly) return;
  const alpha = Number.parseFloat(value);
  if (!Number.isFinite(alpha)) return;
  picker.value.setChannelValue("alpha", Math.min(1, Math.max(0, alpha)));
}
</script>

<template>
  <section class="qk-color-picker__editor" :aria-label="label ?? text.editor">
    <div v-if="showBack" class="qk-color-picker__editor-header">
      <button type="button" class="qk-color-picker__back" @click="emit('back')">
        <span aria-hidden="true">‹</span>
        <span>{{ text.back }}</span>
      </button>
    </div>

    <ColorPicker.Area
      x-channel="saturation"
      y-channel="brightness"
      class="qk-color-picker__area"
      :aria-label="text.area"
    >
      <ColorPicker.AreaBackground class="qk-color-picker__area-background" />
      <ColorPicker.AreaThumb class="qk-color-picker__area-thumb" />
    </ColorPicker.Area>

    <div class="qk-color-picker__slider-row">
      <ColorPicker.EyeDropperTrigger
        v-if="showEyedropper"
        type="button"
        :disabled="!eyedropperSupported"
        :aria-label="text.eyedropper"
        :title="eyedropperSupported ? text.eyedropper : text.eyedropperUnsupported(text.eyedropper)"
        class="qk-color-picker__eye-dropper"
      >
        <QuireIcon name="pipette" :size="20" />
      </ColorPicker.EyeDropperTrigger>
      <div class="qk-color-picker__sliders">
        <ColorPicker.ChannelSlider channel="hue" class="qk-color-picker__slider" :aria-label="text.hue">
          <ColorPicker.ChannelSliderTrack class="qk-color-picker__slider-track" />
          <ColorPicker.ChannelSliderThumb class="qk-color-picker__slider-thumb" />
        </ColorPicker.ChannelSlider>
        <ColorPicker.ChannelSlider
          v-if="showAlpha"
          channel="alpha"
          class="qk-color-picker__slider"
          :aria-label="text.alpha"
        >
          <ColorPicker.TransparencyGrid
            class="qk-color-picker__transparency-grid"
            :style="{ left: '-7px', width: 'calc(100% + 14px)' }"
          />
          <ColorPicker.ChannelSliderTrack class="qk-color-picker__slider-track" />
          <ColorPicker.ChannelSliderThumb class="qk-color-picker__slider-thumb" />
        </ColorPicker.ChannelSlider>
      </div>
    </div>

    <div
      :class="[
        'qk-color-picker__inputs',
        !showAlpha && 'qk-color-picker__inputs--without-alpha'
      ]"
    >
      <label class="qk-color-picker__input-group">
        <span>{{ text.format }}</span>
        <QuireSelect
          :model-value="inputFormat"
          :items="inputFormatItems"
          :label="text.formatLabel"
          size="md"
          width="64px"
          content-width="88px"
          @update:model-value="updateInputFormat"
        />
      </label>

      <div class="qk-color-picker__input-group">
        <span v-if="inputFormat === 'hex'">{{ text.value }}</span>
        <QuireColorChannelInputs :format="inputFormat" />
      </div>

      <label
        v-if="showAlpha"
        class="qk-color-picker__input-group qk-color-picker__input-group--alpha"
      >
        <span>Alpha</span>
        <QuireInputNumber
          :model-value="String(Math.round(alphaValue * 100) / 100)"
          :disabled="Boolean(inputState.disabled)"
          :read-only="Boolean(inputState.readonly)"
          label="Alpha"
          :min="0"
          :max="1"
          :step="0.01"
          :small-step="0.01"
          :large-step="0.1"
          :format-options="{ maximumFractionDigits: 2 }"
          size="md"
          width="100%"
          @update:model-value="updateAlpha"
        />
      </label>
    </div>
  </section>
</template>
