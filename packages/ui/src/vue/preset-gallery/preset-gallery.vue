<script setup lang="ts">
import { computed, ref } from "vue";
import type { QuireKitPresetGalleryItem, QuireKitPresetGalleryItemSlotProps } from "../../components/preset-gallery";
import { normalizePresetGalleryColumns, presetGalleryMinimumWidth } from "../../components/preset-gallery/geometry";
import QuireListbox from "../listbox/listbox.vue";
import QuireEmptyState from "../empty-state/empty-state.vue";
import { useGalleryColumns } from "./use-gallery-columns";
import QuireTooltipRoot from "../tooltip/root.vue";
import QuireTooltipTrigger from "../tooltip/trigger.vue";
import QuireTooltipContent from "../tooltip/content.vue";
import PresetActionCards from './actions.vue';
import { useQuireKitMessages } from "../locale-provider/context";

/** 单选预设图库的属性。 */
interface Props {
  /** 图库的可见标题与可访问名称。 */
  readonly label: string;
  /** 是否仅在视觉上隐藏标题，保留列表的可访问名称。 */
  readonly hideLabel?: boolean;
  /** Cards with labels, or a dense icon grid whose names remain accessible. */
  readonly presentation?: "cards" | "icons";
  /** 预设列表，每项使用稳定的 value。 */
  readonly items: readonly QuireKitPresetGalleryItem[];
  /** 受控选中值；null 清除选择。 */
  readonly modelValue?: string | null;
  /** 非受控模式的初始选择。 */
  readonly defaultValue?: string | null;
  /** 是否禁止用户选择，同时保留可见内容。 */
  readonly disabled?: boolean;
  /** 最大列数。 */
  readonly maxColumns?: number;
  /** 理想最小项宽度，默认 spacing.major × 3（144px）；窄容器中可继续收窄。 */
  readonly minItemWidth?: string;
}

/** 预设选择事件。 */
interface Emits {
  /** 用户显式提交可用预设时触发，包含再次选择当前预设；每次点击或 Enter / Space 各触发一次。 */
  select: [value: string];
  /** 同步选中的预设。 */
  "update:modelValue": [value: string | null];
  /** 当前预设值发生变化后触发；再次提交相同值不触发。 */
  valueChange: [value: string | null];
}

/** 图库的内容插槽。 */
interface Slots {
  /** 绘制预览内容；不放置按钮、链接或输入框。 */
  readonly preview?: (props: QuireKitPresetGalleryItemSlotProps) => unknown;
  /** Independent card actions. In cards mode this opts into native selection buttons with sibling controls. */
  readonly actions?: (props: QuireKitPresetGalleryItemSlotProps) => unknown;
  /** 自定义没有预设时的内容。 */
  readonly empty?: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  hideLabel: false,
  presentation: "cards",
  disabled: false,
  maxColumns: 4
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("presetGallery");
/** 当前键盘导航的预设，与选中值分别管理。 */
const highlightedValue = defineModel<string | null>("highlightedValue");
const host = ref<HTMLElement>();
const localValue = ref(props.defaultValue ?? null);
const value = computed(() => props.modelValue === undefined ? localValue.value : props.modelValue);
const values = computed(() => value.value === null ? [] : [value.value]);
const minimumWidth = computed(() => props.minItemWidth ?? (props.presentation === "icons" ? "28px" : presetGalleryMinimumWidth));
const columns = useGalleryColumns(host, () => [props.items.length, props.maxColumns, minimumWidth.value]);
const style = computed(() => ({
  "--qk-preset-gallery-min-width": minimumWidth.value,
  "--qk-preset-gallery-max-columns": normalizePresetGalleryColumns(props.maxColumns)
}));

/**
 * Convert the shared collection's selection into the gallery's single value.
 *
 * @param selected - Values emitted by the Listbox's single-selection machine.
 */
function updateValue(selected: readonly string[] | undefined): void {
  const next = selected?.[0] ?? null;
  localValue.value = next;
  emit("update:modelValue", next);
  emit("valueChange", next);
}

/** @param next - Explicitly activated management card; repeated activation still submits once. */
function selectCard(next: string): void {
  if (value.value !== next) updateValue([next]);
  emit('select', next);
}
</script>

<template>
  <div ref="host" :class="['qk-preset-gallery', presentation === 'icons' && 'qk-preset-gallery--icons']" :style="style">
    <PresetActionCards v-if="$slots.actions && presentation === 'cards'" :label="label" :hide-label="hideLabel" :items="items" :value="value"
      :highlighted="highlightedValue ?? null" :disabled="disabled" :columns="columns" @select="selectCard" @highlight="highlightedValue = $event">
      <template v-if="$slots.preview" #preview="context"><slot name="preview" v-bind="context" /></template>
      <template #actions="context"><slot name="actions" v-bind="context" /></template>
      <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    </PresetActionCards>
    <QuireListbox
      v-else
      :label="label" :hide-label="hideLabel" :items="items" :model-value="values" :disabled="disabled"
      v-model:highlighted-value="highlightedValue" layout="grid" :column-count="columns"
      content-class="qk-preset-gallery__grid"
      :item-class="presentation === 'icons' ? 'qk-preset-gallery__item qk-preset-gallery__item--icon' : 'qk-preset-gallery__item'"
      @update:model-value="updateValue"
      @select="emit('select', $event)"
    >
      <template #item="{ item, selected, highlighted, disabled: itemDisabled }">
        <QuireTooltipRoot v-if="presentation === 'icons'" :disabled="itemDisabled" placement="bottom">
          <QuireTooltipTrigger as-child>
            <div class="qk-preset-gallery__preview qk-preset-gallery__preview--icon" :data-selected="selected ? '' : undefined" aria-hidden="true">
              <slot name="preview" :item="item as QuireKitPresetGalleryItem" :selected="selected" :highlighted="highlighted" :disabled="itemDisabled">
                <span class="qk-preset-gallery__sample">Aa</span>
              </slot>
            </div>
          </QuireTooltipTrigger>
          <QuireTooltipContent :content="item.label" />
        </QuireTooltipRoot>
        <div v-else class="qk-preset-gallery__preview" :data-selected="selected ? '' : undefined" aria-hidden="true">
          <slot name="preview" :item="item as QuireKitPresetGalleryItem" :selected="selected" :highlighted="highlighted" :disabled="itemDisabled">
            <span class="qk-preset-gallery__sample">Aa</span>
          </slot>
        </div>
        <span :class="presentation === 'icons' ? 'qk-listbox__visually-hidden' : 'qk-preset-gallery__label'" :data-selected="selected ? '' : undefined">{{ item.label }}</span>
        <span v-if="item.description && presentation !== 'icons'" class="qk-preset-gallery__description">{{ item.description }}</span>
      </template>
      <template #empty><slot name="empty"><QuireEmptyState :title="text.empty" size="sm" /></slot></template>
    </QuireListbox>
  </div>
</template>
