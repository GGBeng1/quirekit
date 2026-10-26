<script setup lang="ts">
import { Tabs } from "@ark-ui/vue/tabs";
import { computed, ref, watch } from "vue";
import type {
  QuireKitTabsActivationMode,
  QuireKitTabsItem,
  QuireKitTabsOrientation,
  QuireKitTabsSize
} from "../../components/tabs";

/** Vue Tabs 的公开属性。 */
interface Props {
  /** tablist 的可访问名称。 */
  readonly label: string;
  /** Render internal panels; false requires each item to name its external panelId. */
  readonly renderPanels?: boolean;
  /** 面板留白；none 用于内部内容已管理留白的组合场景。 */
  readonly contentPadding?: "default" | "none";
  /** 按 DOM 顺序渲染的稳定页签。 */
  readonly items: readonly QuireKitTabsItem[];
  /** 未受控使用时的初始页签；省略时选中第一个可用页签。 */
  readonly defaultValue?: string;
  /** 页签布局和方向键导航方向。 */
  readonly orientation?: QuireKitTabsOrientation;
  /** 页签高度与排版尺寸。 */
  readonly size?: QuireKitTabsSize;
  /** 聚焦页签时自动选中，或等待 Enter/Space 手动确认。 */
  readonly activationMode?: QuireKitTabsActivationMode;
  /** 键盘导航是否从末项循环至首项。 */
  readonly loopFocus?: boolean;
  /** 是否延迟挂载尚未访问的面板。 */
  readonly lazyMount?: boolean;
  /** 面板退出时是否卸载其内容。 */
  readonly unmountOnExit?: boolean;
}

/** 页签标签插槽的稳定上下文。 */
interface TriggerSlotProps {
  /** 当前页签合同。 */
  readonly item: QuireKitTabsItem;
  /** 当前页签是否已选中。 */
  readonly selected: boolean;
}

/** 页签面板插槽的稳定上下文。 */
interface ContentSlotProps {
  /** 当前页签合同。 */
  readonly item: QuireKitTabsItem;
  /** 当前面板是否处于选中状态。 */
  readonly selected: boolean;
}

/** Tabs 的可替换内容位置。 */
interface Slots {
  /** 替换页签的可见标签。 */
  readonly trigger?: (props: TriggerSlotProps) => unknown;
  /** 替换每个页签面板内容。 */
  readonly content?: (props: ContentSlotProps) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  renderPanels: true,
  contentPadding: "default",
  orientation: "horizontal",
  size: "sm",
  activationMode: "automatic",
  loopFocus: true,
  lazyMount: false,
  unmountOnExit: false
});
const selectedValue = defineModel<string | undefined>();
defineSlots<Slots>();

const initialValue = computed(() => (
  props.defaultValue ?? props.items.find((item) => item.disabled !== true)?.value
));
const currentValue = computed(() => selectedValue.value ?? initialValue.value);
// Ark 5.39 presence only records a visit after present changes, so an initially
// selected lazy panel can be destroyed on its first exit. Keep Ark's panel/focus
// ownership and apply the public mount policy to slot contents instead.
const visited = ref(new Set<string>());
watch(currentValue, value => {
  if (value !== undefined) visited.value.add(value);
}, { immediate: true });
const optionalRootProps = computed(() => ({
  ...(selectedValue.value === undefined ? {} : { modelValue: selectedValue.value }),
  ...(initialValue.value === undefined ? {} : { defaultValue: initialValue.value })
}));

/** 把 Ark 的下一值同步给可选的 v-model。 */
function updateValue(value: string): void {
  selectedValue.value = value;
}
</script>

<template>
  <Tabs.Root
    v-bind="optionalRootProps"
    :orientation="orientation"
    :activation-mode="activationMode"
    :loop-focus="loopFocus"
    :class="['qk-tabs', `qk-tabs--${orientation}`]"
    @update:model-value="updateValue"
  >
    <Tabs.List
      :aria-label="label"
      :class="['qk-tabs__list', `qk-tabs__list--${orientation}`]"
    >
      <Tabs.Trigger
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        v-bind="item.panelId ? { 'aria-controls': item.panelId } : {}"
        :disabled="item.disabled"
        :class="['qk-tabs__trigger', `qk-tabs__trigger--${size}`]"
      >
        <slot name="trigger" :item="item" :selected="currentValue === item.value">
          {{ item.label }}
        </slot>
      </Tabs.Trigger>
      <Tabs.Indicator class="qk-tabs__indicator" />
    </Tabs.List>

    <div v-if="renderPanels" class="qk-tabs__panels">
      <Tabs.Content
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="qk-tabs__content"
        :style="contentPadding === 'none' ? { padding: 0 } : undefined"
      >
        <slot v-if="(!lazyMount || visited.has(item.value)) && (!unmountOnExit || currentValue === item.value)" name="content" :item="item" :selected="currentValue === item.value">
          {{ item.content }}
        </slot>
      </Tabs.Content>
    </div>
  </Tabs.Root>
</template>
