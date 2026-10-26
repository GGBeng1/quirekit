<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import QuireThemePortal from "../theme-provider/portal.vue";
import { ColorPicker } from "@ark-ui/vue/color-picker";
import { Popover } from "@ark-ui/vue/popover";
import { computed, onMounted, ref, watch } from "vue";
import type {
  QuireKitColorPickerProps
} from "../../components/color-picker";
import QuireColorEditor from "./color-editor.vue";
import QuireColorPalette from "./color-palette.vue";
import QuireColorPickerRoot from "./color-picker-root.vue";
import { useColorResetState } from "./use-reset-state";
import { useModalPortal } from "../shared/surface/use-modal-portal";
import { useQuireKitMessages } from "../locale-provider/context";

/** 开箱即用 Color Picker 的公开事件。 */
interface Emits {
  /** 同步受控 CSS 颜色字符串。 */
  "update:modelValue": [value: string];
  /** 同步当前是否为无颜色。 */
  "update:resetActive": [value: boolean];
  /** 同步受控浮层状态。 */
  "update:open": [open: boolean];
  /** 连续颜色预览。 */
  valueChange: [value: string];
  /** 一次颜色交互结束。 */
  valueChangeEnd: [value: string];
  /** 用户提交快捷或精确颜色。 */
  commit: [value: string];
  /** 用户请求清除颜色语义。 */
  reset: [];
}

/** 外层 Color Picker 的可替换触发器插槽。 */
interface Slots {
  /** 替换默认触发器；使用关联当前颜色面板的触发器组件。 */
  readonly trigger?: (props: { readonly reset: boolean; readonly value: string }) => unknown;
}

// 显式保留 undefined，避免 Vue 把缺省 Boolean prop 强制转换为 false 并误入受控模式。
const props = withDefaults(defineProps<QuireKitColorPickerProps>(), {
  open: undefined as never,
  resetActive: undefined,
  defaultValue: "#1677FF",
  defaultOpen: false,
  size: "sm",
  placement: "bottom-start",
  recentColors: () => [],
  allowReset: true,
  showMore: true,
  showAlpha: true,
  showEyedropper: true,
  inputFormats: () => ["hex", "rgb", "hsl", "hsb"],
  defaultInputFormat: "hex",
  portalled: true,
  disabled: false
});
const portal = useQuireOverlayHost(() => props.portalTarget);
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("colorPicker");
const accessibleLabel = computed(() => props.label ?? text.value.label);

const editorOpen = ref(false);
const internalOpen = ref(props.defaultOpen);
watch(() => props.open ?? internalOpen.value, open => {
  if (!open) editorOpen.value = false;
});
const { hasModalOwner, disabled: portalDisabled } = useModalPortal(() => props.portalled, () => props.open ?? internalOpen.value);
// Hydrate beside the trigger before joining the shared target; sibling async
// boundaries must not consume this color panel's server portal in another order.
const mounted = ref(false);
onMounted(() => { mounted.value = true; });
const { resetActive, setResetActive } = useColorResetState(() => props.resetActive, value => emit("update:resetActive", value));
const internalValue = ref(props.modelValue ?? props.defaultValue);
const optionalRootBindings = computed(() => ({
  ...(props.open === undefined ? {} : { open: props.open }),
  ...(props.name === undefined ? {} : { name: props.name })
}));
const optionalPaletteBindings = computed(() => ({
  ...(props.colors === undefined ? {} : { colors: props.colors })
}));

// 面板宽度跟随最宽一行色板，固定小色板不留空白。
const contentStyle = computed(() => props.colors === undefined
  ? {}
  : { "--qk-color-picker-columns": Math.max(1, ...props.colors.map(row => row.length)) });

/** @returns 当前受控或非受控 CSS 颜色值。 */
function currentValue(): string {
  return props.modelValue ?? internalValue.value;
}

/**
 * 同步颜色值并维持非受控回退。
 *
 * @param value - Root 返回的稳定 CSS 颜色字符串。
 */
function updateValue(value: string): void {
  setResetActive(false);
  internalValue.value = value;
  emit("update:modelValue", value);
}

watch(() => props.modelValue, (value, previousValue) => {
  if (value !== previousValue && props.resetActive === undefined) setResetActive(false);
});

/**
 * 关闭后把下一次打开恢复到快捷色板。
 *
 * @param open - Root machine 的最新打开状态。
 */
function updateOpen(open: boolean): void {
  internalOpen.value = open;
  if (!open) editorOpen.value = false;
  emit("update:open", open);
}

/** 从精确颜色编辑器返回快捷色板。 */
function closeEditor(): void {
  editorOpen.value = false;
}

/** 表达无颜色语义并同步外层触发器的可见状态。 */
function resetValue(): void {
  setResetActive(true);
  emit("reset");
}

/** @param value - Selected quick color, including reselecting the previous editable color. */
function commitPaletteColor(value: string): void {
  setResetActive(false);
  emit("commit", value);
}
</script>

<template>
  <QuireColorPickerRoot
    v-bind="optionalRootBindings"
    :model-value="props.modelValue === undefined ? internalValue : props.modelValue"
    :default-value="props.defaultValue"
    :default-open="props.defaultOpen"
    :placement="props.placement"
    :disabled="props.disabled"
    @update:model-value="updateValue"
    @update:open="updateOpen"
    @value-change="emit('valueChange', $event)"
    @value-change-end="emit('valueChangeEnd', $event); emit('commit', $event)"
  >
    <ColorPicker.Control>
      <slot
        v-if="$slots.trigger"
        name="trigger"
        :value="currentValue()"
        :reset="resetActive"
      />
      <ColorPicker.Trigger
        v-else
        :aria-label="accessibleLabel"
        :class="['qk-color-picker__trigger', `qk-color-picker__trigger--${props.size}`]"
      >
        <slot name="trigger" :value="currentValue()" :reset="resetActive">
          <span v-if="resetActive" class="qk-color-picker__trigger-none" />
          <template v-else>
            <ColorPicker.TransparencyGrid class="qk-color-picker__trigger-grid" />
            <ColorPicker.ValueSwatch respect-alpha class="qk-color-picker__trigger-swatch" />
          </template>
        </slot>
      </ColorPicker.Trigger>
      <ColorPicker.HiddenInput />
    </ColorPicker.Control>

    <Teleport :to="portal.target.value" :disabled="portalDisabled || !mounted">
      <QuireThemePortal>
        <ColorPicker.Positioner :class="['qk-color-picker__positioner', hasModalOwner && 'qk-color-picker__positioner--modal']">
          <ColorPicker.Content
            v-bind="props.contentAttributes"
            :aria-label="accessibleLabel"
            :class="[
              'qk-color-picker__content',
              editorOpen && 'qk-color-picker__content--editor'
            ]"
            :data-editor-open="editorOpen ? 'true' : 'false'"
            :style="contentStyle"
          >
            <!-- Keep the color machine's DOM descendants, but let the nested layer
                 measure, flip and dismiss independently of the palette. When neither
                 side fits, allow overlap so the editor stays inside the viewport. -->
            <Popover.Root
              v-model:open="editorOpen"
              :portalled="false"
              :positioning="{ strategy: portal.strategy.value ?? 'fixed', placement: 'right-start', gutter: 2, flip: ['left-start'], slide: true, overlap: true }"
              lazy-mount
              unmount-on-exit
            >
              <Popover.Anchor as-child>
                <QuireColorPalette
                  v-bind="optionalPaletteBindings"
                  :recent-colors="props.recentColors"
                  :reset-label="props.resetLabel"
                  :allow-reset="props.allowReset"
                  :show-more="props.showMore"
                  :reset-active="resetActive"
                  :close-on-commit="true"
                  @commit="commitPaletteColor"
                  @reset="resetValue"
                >
                  <template #more="{ disabled }">
                    <Popover.Trigger class="qk-color-picker__more" :disabled="disabled">
                      <span>{{ text.more }}</span>
                      <svg class="qk-color-picker__more-icon" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="m6 3.5 4 4.5-4 4.5" />
                      </svg>
                    </Popover.Trigger>
                  </template>
                </QuireColorPalette>
              </Popover.Anchor>
              <Popover.Positioner class="qk-color-picker__editor-positioner">
                <Popover.Content class="qk-color-picker__editor-panel" :aria-label="text.more">
                  <QuireColorEditor
                    :show-alpha="props.showAlpha"
                    :show-eyedropper="props.showEyedropper"
                    :input-formats="props.inputFormats"
                    :default-input-format="props.defaultInputFormat"
                    show-back
                    @back="closeEditor"
                  />
                </Popover.Content>
              </Popover.Positioner>
            </Popover.Root>
          </ColorPicker.Content>
        </ColorPicker.Positioner>
      </QuireThemePortal>
    </Teleport>
  </QuireColorPickerRoot>
</template>
