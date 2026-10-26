<script setup lang="ts">
import { Splitter, useSplitter } from "@ark-ui/vue/splitter";
import { computed } from "vue";
import { useQuireKitMessages } from "../locale-provider/context";
import type {
  QuireKitSplitterHandle,
  QuireKitSplitterHandleSlotProps,
  QuireKitSplitterHandleSize,
  QuireKitSplitterHandleVariant,
  QuireKitSplitterOrientation,
  QuireKitSplitterPanel,
  QuireKitSplitterPanelChangeDetails,
  QuireKitSplitterPanelSlotProps,
  QuireKitSplitterResizeDetails
} from "../../components/splitter";

/** Vue Splitter 适配器的公开属性。 */
interface Props {
  /** Splitter 根节点的稳定标识。 */
  readonly id?: string;
  /** 面板及其尺寸约束。 */
  readonly panels: readonly QuireKitSplitterPanel[];
  /** 未受控使用时的初始面板百分比尺寸。 */
  readonly defaultSize?: number[];
  /** 面板排列与调整方向。 */
  readonly orientation?: QuireKitSplitterOrientation;
  /** 键盘方向键每次调整的百分点；Shift 加方向键固定调整 10 个百分点。 */
  readonly keyboardResizeBy?: number;
  /** 调整柄的可见粗细；可拖动范围大于可见线条。 */
  readonly handleSize?: QuireKitSplitterHandleSize;
  /** 调整柄的内置视觉；custom 由 handle 插槽完整接管。 */
  readonly handleVariant?: QuireKitSplitterHandleVariant;
  /** 是否禁止全部调整柄交互。 */
  readonly disabled?: boolean;
  /** Splitter 的可访问名称。 */
  readonly label: string;
}

/** Splitter 的可替换内容位置。 */
interface Slots {
  /** 渲染每一个面板的业务内容。 */
  readonly panel?: (props: QuireKitSplitterPanelSlotProps) => unknown;
  /** 替换面板之间的调整柄指示器。 */
  readonly handle?: (props: QuireKitSplitterHandleSlotProps) => unknown;
}

/** Splitter 发出的公开语义事件。 */
interface Emits {
  /** 用户开始拖拽或键盘调整时触发。 */
  resizeStart: [];
  /** 调整期间持续报告最新尺寸。 */
  resize: [details: QuireKitSplitterResizeDetails];
  /** 一次调整结束后报告最终尺寸。 */
  resizeEnd: [details: QuireKitSplitterResizeDetails];
  /** 面板通过公开命令折叠后触发。 */
  collapse: [details: QuireKitSplitterPanelChangeDetails];
  /** 面板通过公开命令展开后触发。 */
  expand: [details: QuireKitSplitterPanelChangeDetails];
}

const props = withDefaults(defineProps<Props>(), {
  defaultSize: () => [],
  orientation: "horizontal",
  keyboardResizeBy: 10,
  handleSize: "sm",
  handleVariant: "line",
  disabled: false
});
const sizes = defineModel<number[] | undefined>("size");
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("splitter");
let panelCommandEventHandled = false;
const splitterRegistry = Splitter.createRegistry({
  hitAreaMargins: {
    coarse: 15,
    fine: 5
  }
});

const splitterProps = computed(() => ({
  ...(props.id === undefined ? {} : { id: props.id }),
  panels: props.panels.map(({ label: _label, ...panel }) => ({ ...panel })),
  orientation: props.orientation,
  keyboardResizeBy: props.keyboardResizeBy,
  registry: splitterRegistry,
  ...(sizes.value === undefined
    ? { defaultSize: props.defaultSize }
    : { size: sizes.value }),
  onResizeStart: handleResizeStart,
  onResize: handleResize,
  onResizeEnd: handleResizeEnd,
  onCollapse: handleCollapse,
  onExpand: handleExpand
}));
const splitter = useSplitter(splitterProps);

/** 报告一次调整开始。 */
function handleResizeStart(): void {
  emit("resizeStart");
}

/**
 * 同步调整期间的面板尺寸。
 *
 * @param details - Ark Splitter 报告的调整详情。
 */
function handleResize(details: { size: number[]; resizeTriggerId: string | null }): void {
  sizes.value = details.size;
  emit("resize", { sizes: details.size, resizeTriggerId: details.resizeTriggerId });
}

/**
 * 报告一次调整结束。
 *
 * @param details - Ark Splitter 报告的最终尺寸。
 */
function handleResizeEnd(details: { size: number[]; resizeTriggerId: string | null }): void {
  emit("resizeEnd", { sizes: details.size, resizeTriggerId: details.resizeTriggerId });
}

/**
 * 报告面板折叠。
 *
 * @param details - 状态发生变化的面板信息。
 */
function handleCollapse(details: QuireKitSplitterPanelChangeDetails): void {
  panelCommandEventHandled = true;
  emit("collapse", details);
}

/**
 * 报告面板展开。
 *
 * @param details - 状态发生变化的面板信息。
 */
function handleExpand(details: QuireKitSplitterPanelChangeDetails): void {
  panelCommandEventHandled = true;
  emit("expand", details);
}

/**
 * 生成相邻面板之间的 Ark 调整柄标识。
 *
 * @param index - 调整柄之前的面板索引。
 * @returns Ark Splitter 使用的稳定相邻面板标识。
 */
function getResizeTriggerId(index: number): `${string}:${string}` {
  return `${props.panels[index]?.id ?? ""}:${props.panels[index + 1]?.id ?? ""}`;
}

/**
 * 返回当前全部面板尺寸。
 *
 * @returns 所有面板按 DOM 顺序排列的百分比尺寸。
 */
function getSizes(): number[] {
  return splitter.value.getSizes();
}

/** @param nextSizes - 需要应用的全部面板尺寸。 */
function setSizes(nextSizes: number[]): void {
  splitter.value.setSizes(nextSizes);
}

/** 恢复初始面板尺寸。 */
function resetSizes(): void {
  splitter.value.resetSizes();
}

/** @param panelId - 需要折叠的面板标识。 */
function collapsePanel(panelId: string): void {
  const wasCollapsed = splitter.value.isPanelCollapsed(panelId);
  panelCommandEventHandled = false;
  splitter.value.collapsePanel(panelId);
  if (!wasCollapsed && splitter.value.isPanelCollapsed(panelId) && !panelCommandEventHandled) {
    handleCollapse({ panelId, size: splitter.value.getPanelSize(panelId) });
  }
}

/**
 * @param panelId - 需要展开的面板标识。
 * @param minSize - 展开时允许覆盖的最小尺寸。
 */
function expandPanel(panelId: string, minSize?: number): void {
  const wasExpanded = splitter.value.isPanelExpanded(panelId);
  panelCommandEventHandled = false;
  splitter.value.expandPanel(panelId, minSize);
  if (!wasExpanded && splitter.value.isPanelExpanded(panelId) && !panelCommandEventHandled) {
    handleExpand({ panelId, size: splitter.value.getPanelSize(panelId) });
  }
}

/**
 * @param panelId - 需要调整的面板标识。
 * @param size - 目标百分比尺寸。
 */
function resizePanel(panelId: string, size: number): void {
  splitter.value.resizePanel(panelId, size);
}

defineExpose<QuireKitSplitterHandle>({
  getSizes,
  setSizes,
  resetSizes,
  collapsePanel,
  expandPanel,
  resizePanel
});
</script>

<template>
  <div class="qk-splitter-frame">
    <Splitter.RootProvider
      :value="splitter"
      :aria-label="label"
      :class="['qk-splitter', `qk-splitter--${orientation}`]"
    >
      <template v-for="(panel, index) in panels" :key="panel.id">
        <Splitter.Panel :id="panel.id" class="qk-splitter__panel">
          <slot name="panel" :panel="panel" :index="index" :size="splitter.getPanelSize(panel.id)">
            <span class="qk-splitter__panel-label">{{ panel.label ?? panel.id }}</span>
          </slot>
        </Splitter.Panel>

        <Splitter.ResizeTrigger
          v-if="index < panels.length - 1"
          :id="getResizeTriggerId(index)"
          :disabled="disabled"
          :tabindex="disabled ? -1 : 0"
          :aria-disabled="disabled || undefined"
          :aria-label="text.resize(panel.label ?? panel.id, panels[index + 1]?.label ?? panels[index + 1]?.id ?? '')"
          :aria-orientation="orientation === 'horizontal' ? 'vertical' : 'horizontal'"
          :class="[
            'qk-splitter__handle',
            `qk-splitter__handle--${handleSize}`,
            `qk-splitter__handle--${handleVariant}`
          ]"
        >
          <Splitter.ResizeTriggerIndicator class="qk-splitter__indicator">
            <slot
              name="handle"
              :before="panel"
              :after="panels[index + 1]!"
              :index="index"
              :orientation="orientation"
            >
              <span class="qk-splitter__indicator-mark" />
            </slot>
          </Splitter.ResizeTriggerIndicator>
        </Splitter.ResizeTrigger>
      </template>
    </Splitter.RootProvider>
  </div>
</template>
