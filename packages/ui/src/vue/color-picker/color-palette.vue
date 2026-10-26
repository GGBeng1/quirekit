<script setup lang="ts">
import { ColorPicker, useColorPickerContext } from "@ark-ui/vue/color-picker";
import { computed } from "vue";
import { quireDocumentColorRows } from "../../color-palette";
import { useQuireKitMessages } from "../locale-provider/context";
import type { QuireKitColorRows } from "../../components/color-picker";

/** 快捷色板的公开属性。 */
interface Props {
  /** 文档快捷颜色矩阵。 */
  readonly colors?: QuireKitColorRows;
  /** 由宿主受控的最近使用颜色。 */
  readonly recentColors?: readonly string[];
  /** 清除颜色动作名称，表达本实例的清除语义（如“自动”“无填充”）；缺省取语言包。 */
  readonly resetLabel?: string | undefined;
  /** 是否显示清除颜色动作。 */
  readonly allowReset?: boolean;
  /** 是否显示进入精确编辑器的动作。 */
  readonly showMore?: boolean;
  /** 当前是否处于由宿主表达的无颜色状态。 */
  readonly resetActive?: boolean;
  /** 选择快捷色后是否关闭所属 Root。 */
  readonly closeOnCommit?: boolean;
}

/** 快捷色板公开事件。 */
interface Emits {
  /** 用户选中一个 CSS 颜色值。 */
  commit: [value: string];
  /** 用户请求清除文档颜色语义。 */
  reset: [];
  /** 用户请求进入精确颜色编辑。 */
  more: [];
}

/** 快捷色板可组合的动作入口。 */
interface Slots {
  /** 替换更多颜色触发器，以接入独立的二级浮层。 */
  readonly more?: (props: { readonly disabled: boolean }) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  colors: () => quireDocumentColorRows.slice(0, 4),
  recentColors: () => [],
  allowReset: true,
  showMore: true,
  resetActive: false,
  closeOnCommit: true
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("colorPicker");
const picker = useColorPickerContext();
const currentColor = computed(() => picker.value.value.toString("hex"));
const unavailable = computed(() => Boolean(picker.value.getSwatchTriggerProps({ value: currentColor.value }).disabled));
// Each preset row is one visual row; grids and panel width follow the widest row.
const paletteColumns = computed(() => Math.max(1, ...props.colors.map(row => row.length)));
const swatchStateBindings = computed(() => props.resetActive
  ? { "data-state": "unchecked" }
  : {});

/**
 * 提交一个快捷颜色并按组合策略关闭浮层。
 *
 * @param value - 被选择的 CSS 颜色字符串。
 */
function commitColor(value: string): void {
  if (unavailable.value) return;
  picker.value.setValue(value);
  emit("commit", value.toUpperCase());
  if (props.closeOnCommit) picker.value.setOpen(false);
}

/** 清除颜色语义并关闭默认浮层。 */
function resetColor(): void {
  if (unavailable.value) return;
  emit("reset");
  if (props.closeOnCommit) picker.value.setOpen(false);
}

/**
 * 判断颜色是否需要白色色块的可见性描边。
 *
 * @param value - 待渲染的 CSS 颜色字符串。
 * @returns 颜色是否为不透明纯白色。
 */
function isWhiteColor(value: string): boolean {
  const normalized = value.toLowerCase().replace(/\s/g, "");
  return normalized === "#fff"
    || normalized === "#ffffff"
    || normalized === "rgb(255,255,255)"
    || normalized === "rgba(255,255,255,1)";
}
</script>

<template>
  <section
    class="qk-color-picker__palette"
    :aria-label="text.palette"
    :style="{ '--qk-color-picker-columns': paletteColumns }"
    :data-reset-active="resetActive ? 'true' : 'false'"
  >
    <div class="qk-color-picker__current" role="status">
      <span v-if="resetActive" class="qk-color-picker__none-swatch" aria-hidden="true" />
      <ColorPicker.ValueSwatch
        v-else
        respect-alpha
        :class="[
          'qk-color-picker__current-swatch',
          isWhiteColor(currentColor) && 'qk-color-picker__swatch--white'
        ]"
      />
      <span class="qk-color-picker__current-label">{{ text.current }}</span>
    </div>

    <div v-if="recentColors.length > 0" class="qk-color-picker__section">
      <h3 class="qk-color-picker__section-title">{{ text.recent }}</h3>
      <ColorPicker.SwatchGroup class="qk-color-picker__recent-grid">
        <ColorPicker.SwatchTrigger
          v-for="color in recentColors"
          :key="color"
          :value="color"
          :aria-label="color"
          v-bind="swatchStateBindings"
          class="qk-color-picker__swatch-trigger"
          :style="{ color }"
          @click="commitColor(color)"
        >
          <ColorPicker.Swatch
            :value="color"
            respect-alpha
            :class="[
              'qk-color-picker__swatch',
              isWhiteColor(color) && 'qk-color-picker__swatch--white'
            ]"
          >
          </ColorPicker.Swatch>
        </ColorPicker.SwatchTrigger>
      </ColorPicker.SwatchGroup>
    </div>

    <div class="qk-color-picker__section">
      <h3 class="qk-color-picker__section-title">{{ text.palette }}</h3>
      <ColorPicker.SwatchGroup class="qk-color-picker__palette-grid">
        <template v-for="(row, rowIndex) in colors" :key="rowIndex">
          <ColorPicker.SwatchTrigger
            v-for="color in row"
            :key="color"
            :value="color"
            :aria-label="color"
            v-bind="swatchStateBindings"
            class="qk-color-picker__swatch-trigger"
            :style="{ color }"
            @click="commitColor(color)"
          >
            <ColorPicker.Swatch
              :value="color"
              respect-alpha
              :class="[
                'qk-color-picker__swatch',
                isWhiteColor(color) && 'qk-color-picker__swatch--white'
              ]"
            >
            </ColorPicker.Swatch>
          </ColorPicker.SwatchTrigger>
        </template>
      </ColorPicker.SwatchGroup>
    </div>

    <div class="qk-color-picker__palette-actions">
      <button
        v-if="allowReset"
        type="button"
        class="qk-color-picker__reset"
        :disabled="unavailable"
        :aria-pressed="resetActive"
        :data-state="resetActive ? 'checked' : undefined"
        @click="resetColor"
      >
        <span class="qk-color-picker__none-swatch" aria-hidden="true" />
        <span>{{ resetLabel ?? text.reset }}</span>
      </button>
      <slot v-if="showMore" name="more" :disabled="unavailable">
        <button
          type="button"
          class="qk-color-picker__more"
          :disabled="unavailable"
          @click="!unavailable && emit('more')"
        >
          <span>{{ text.more }}</span>
          <svg class="qk-color-picker__more-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m6 3.5 4 4.5-4 4.5" />
          </svg>
        </button>
      </slot>
    </div>
  </section>
</template>
