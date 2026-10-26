<script setup lang="ts">
import type { QuireKitListDensity } from "../../components/control";

import { Listbox, useListbox } from "@ark-ui/vue/listbox";
import type { ListboxHighlightChangeDetails, ListboxValueChangeDetails } from "@ark-ui/vue/listbox";
import { computed, ref } from "vue";
import type {
  QuireKitListboxGroup,
  QuireKitListboxHighlightChangeDetails,
  QuireKitListboxItem,
  QuireKitListboxItemSlotProps,
  QuireKitListboxLayout,
  QuireKitListboxSelectionMode,
  QuireKitListboxValueChangeDetails
} from "../../components/listbox";
import { createListboxCollection, filterListboxSelection, groupListboxItems } from "./collection";
import { guardListboxActivation } from "./keyboard";
import ListboxItem from "./item.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** 常驻 Listbox 的公开属性。 */
interface Props {
  /** Option content density, independent of the containing layout. */
  readonly density?: QuireKitListDensity;
  /** 可见标签和列表的可访问名称。 */
  readonly label: string;
  /** 当前可见选项；过滤不会自动清空暂时不可见的选择。 */
  readonly items: readonly QuireKitListboxItem[];
  /** 非受控使用时的初始选择。 */
  readonly defaultValue?: string[];
  /** 非受控高亮的初始值。 */
  readonly defaultHighlightedValue?: string | null;
  /** 单选、无修饰键多选或使用修饰键的扩展多选。 */
  readonly selectionMode?: QuireKitListboxSelectionMode;
  /** 线性列表或支持二维导航的网格。 */
  readonly layout?: QuireKitListboxLayout;
  /** 网格布局和二维导航使用的正整数列数。 */
  readonly columnCount?: number;
  /** 是否禁止整个列表的选择和键盘导航。 */
  readonly disabled?: boolean;
  /** 方向键到达边界后是否循环；网格上下导航沿同列循环。 */
  readonly loopFocus?: boolean;
  /** 是否启用按标签前缀导航。 */
  readonly typeahead?: boolean;
  /** 键盘高亮变化时是否同时更新选择；默认不更新。 */
  readonly selectOnHighlight?: boolean;
  /** 是否允许重新选择或 Escape 清空选择。 */
  readonly deselectable?: boolean;
  /** 是否禁止 Ctrl / Command+A 全选。 */
  readonly disallowSelectAll?: boolean;
  /** 是否仅在视觉上隐藏标签。 */
  readonly hideLabel?: boolean;
  /** 附加到选项根节点的自定义类。 */
  readonly itemClass?: string;
  /** 附加到可滚动内容区的自定义类。 */
  readonly contentClass?: string;
}

/** 可替换的非交互内容。 */
interface Slots {
  /** 完整替换条目预览；不得内嵌交互控件。 */
  readonly item?: (props: QuireKitListboxItemSlotProps) => unknown;
  /** 替换组标题，不替换分组与选项语义。 */
  readonly groupLabel?: (props: QuireKitListboxGroup) => unknown;
  /** 没有可见候选时的恢复内容。 */
  readonly empty?: () => unknown;
}

/** 列表选择与候选导航各自的公开事件。 */
interface Emits {
  /** 单选模式中显式提交可用项，包含再次提交已选项；导航和程序更新不触发。 */
  select: [value: string];
  /** 一次完整的选择值更新。 */
  valueChange: [details: QuireKitListboxValueChangeDetails];
  /** 一次高亮候选变化，不隐式代表值选择。 */
  highlightChange: [details: QuireKitListboxHighlightChangeDetails];
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: () => [],
  defaultHighlightedValue: null,
  selectionMode: "single",
  layout: "list",
  columnCount: 1,
  disabled: false,
  loopFocus: false,
  typeahead: true,
  selectOnHighlight: false,
  deselectable: false,
  disallowSelectAll: false,
  hideLabel: false
});
const text = useQuireKitMessages("listbox");
const value = defineModel<string[] | undefined>();
const highlightedValue = defineModel<string | null | undefined>("highlightedValue");
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const internalValue = ref([...props.defaultValue]);
const currentValue = computed(() => value.value ?? internalValue.value);
const groups = computed(() => groupListboxItems(props.items));
const orderedItems = computed(() => groups.value.flatMap(group => group.items));
const collection = computed(() => createListboxCollection(orderedItems.value, props.layout, props.columnCount, props.loopFocus));
const contentStyle = computed(() => ({ "--qk-listbox-columns": props.columnCount }));
const highlightProps = computed(() => {
  if (highlightedValue.value !== undefined) return { highlightedValue: highlightedValue.value };
  const initial = props.defaultHighlightedValue ?? currentValue.value.find(value => (
    collection.value.has(value) && !collection.value.getItemDisabled(collection.value.find(value))
  ));
  return initial === undefined ? {} : { defaultHighlightedValue: initial };
});

// 使用 Ark 的官方 composable 绕过生成 Root 类型丢失 null 的问题，状态机仍只有一份。
const listbox = useListbox(computed(() => ({
  ...highlightProps.value,
  collection: collection.value,
  modelValue: currentValue.value,
  selectionMode: props.selectionMode,
  disabled: props.disabled,
  loopFocus: props.loopFocus,
  typeahead: props.typeahead,
  selectOnHighlight: props.selectOnHighlight,
  deselectable: props.deselectable,
  disallowSelectAll: props.disallowSelectAll,
  onValueChange: changeValue,
  onHighlightChange: changeHighlight
})));

/**
 * 约束上游批量更新，再同步宿主的完整选择。
 *
 * @param details - Ark 返回的选择值和缓存候选。
 */
function changeValue(details: ListboxValueChangeDetails<QuireKitListboxItem>): void {
  const next = filterListboxSelection(details.value, currentValue.value, props.items);
  internalValue.value = next;
  value.value = next;
  emit("valueChange", { value: next, items: details.items.filter(item => next.includes(item.value)) });
}

/**
 * 透传候选导航，不把它转换成额外的选择更新。
 *
 * @param details - Ark 返回的高亮值、候选和可见索引。
 */
function changeHighlight(details: ListboxHighlightChangeDetails<QuireKitListboxItem>): void {
  highlightedValue.value = details.highlightedValue;
  emit("highlightChange", details);
}

/**
 * Checks the live candidate before Ark processes keyboard activation.
 *
 * @param event - Native key event on the Listbox content.
 */
function guardActivation(event: KeyboardEvent): void {
  const item = collection.value.find(listbox.value.highlightedValue);
  const itemDisabled = item !== null && collection.value.getItemDisabled(item);
  const activationKey = event.key === "Enter" || event.key === " " || event.key === "Spacebar";
  const accepted = activationKey && !props.disabled && !itemDisabled && item !== null
    && !event.defaultPrevented && !event.isComposing && event.keyCode !== 229;
  guardListboxActivation(event, props.disabled, itemDisabled);
  if (!accepted || props.selectionMode !== "single") return;
  // Explicit single-value submission uses the machine's public selection command.
  // Owning this one keyboard dispatch lets repeated submissions stay observable,
  // while stopping the later key handler prevents a second selection operation.
  event.preventDefault();
  event.stopImmediatePropagation();
  listbox.value.selectValue(item.value);
  select(item.value);
}

/**
 * Reports a single-value submission while retaining the current collection gate.
 * @param value - Stable identity of the explicitly activated option.
 */
function select(value: string): void {
  const item = collection.value.find(value);
  if (props.selectionMode !== "single" || props.disabled || item === null || collection.value.getItemDisabled(item)) return;
  emit("select", value);
}
</script>

<template>
  <Listbox.RootProvider :value="listbox" class="qk-listbox">
    <Listbox.Label :class="['qk-listbox__label', hideLabel && 'qk-listbox__visually-hidden']">{{ label }}</Listbox.Label>
    <Listbox.Content
      :class="['qk-listbox__content', `qk-listbox__content--${layout}`, `qk-listbox__content--${density ?? 'regular'}`, contentClass]"
      :style="contentStyle" :tabindex="disabled ? -1 : 0" :aria-disabled="disabled || undefined"
      :data-highlight-empty="listbox.highlightedValue === null ? '' : undefined"
      @keydown.capture="guardActivation"
    >
      <template v-for="group in groups" :key="group.label === undefined ? 'ungrouped' : `group:${group.label}`">
        <Listbox.ItemGroup v-if="group.label !== undefined" :id="`group:${encodeURIComponent(group.label)}`" class="qk-listbox__group">
          <Listbox.ItemGroupLabel class="qk-listbox__group-label">
            <slot name="groupLabel" v-bind="group">{{ group.label }}</slot>
          </Listbox.ItemGroupLabel>
          <ListboxItem v-for="item in group.items" :key="item.value" :item="item" :item-class="itemClass" @select="select">
            <template v-if="$slots.item" #default="slotProps"><slot name="item" v-bind="slotProps" /></template>
          </ListboxItem>
        </Listbox.ItemGroup>
        <template v-else>
          <ListboxItem v-for="item in group.items" :key="item.value" :item="item" :item-class="itemClass" @select="select">
            <template v-if="$slots.item" #default="slotProps"><slot name="item" v-bind="slotProps" /></template>
          </ListboxItem>
        </template>
      </template>
    </Listbox.Content>
    <div v-if="items.length === 0" class="qk-listbox__empty"><slot name="empty">{{ text.empty }}</slot></div>
  </Listbox.RootProvider>
</template>
