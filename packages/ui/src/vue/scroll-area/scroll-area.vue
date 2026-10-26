<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type {
  QuireKitScrollAreaAxis,
  QuireKitScrollAreaEdge,
  QuireKitScrollAreaPosition,
  QuireKitScrollAreaSize,
  QuireKitScrollAreaVisibility
} from "../../components/scroll-area";
import { useScrollSync } from "./use-scroll-sync";

/** Vue ScrollArea 适配器的公开属性。 */
interface Props {
  /** ScrollArea 根节点的稳定标识。 */
  readonly id?: string;
  /** 需要呈现自定义滚动条的轴。 */
  readonly axis?: QuireKitScrollAreaAxis;
  /** 滚动条始终可见，或仅在悬停、滚动与拖拽期间显示。 */
  readonly scrollbarVisibility?: QuireKitScrollAreaVisibility;
  /** 滚动条轨道与滑块的粗细。 */
  readonly size?: QuireKitScrollAreaSize;
  /** 滚动区域的可访问名称；提供后可作为独立区域辨认。 */
  readonly label?: string;
  /** 附加到 viewport 的样式类。 */
  readonly viewportClass?: string;
  /** 附加到 content 的样式类。 */
  readonly contentClass?: string;
}

/** ScrollArea 的内容插槽。 */
interface Slots {
  /** 可滚动的内容。 */
  readonly default?: () => unknown;
}

/** ScrollArea 发出的公开语义事件。 */
interface Emits {
  /** viewport 原生滚动后报告最新坐标。 */
  scroll: [position: QuireKitScrollAreaPosition];
}

/** ScrollArea 公开给模板引用的命令。 */
interface Exposed {
  /** 挂载后取得真实滚动 viewport；卸载后为 null，用于测量与滚动互操作。 */
  readonly getViewportElement: () => HTMLElement | null;
  /** 滚动到指定坐标。 */
  readonly scrollTo: (details: ScrollToOptions) => void;
  /** 滚动到指定内容边缘。 */
  readonly scrollToEdge: (
    edge: QuireKitScrollAreaEdge,
    behavior?: ScrollBehavior
  ) => void;
}

const props = withDefaults(defineProps<Props>(), {
  axis: "vertical",
  scrollbarVisibility: "auto",
  size: "sm"
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();

const root = shallowRef<HTMLElement | null>(null);
const viewport = shallowRef<HTMLElement | null>(null);
const content = shallowRef<HTMLElement | null>(null);
const verticalBar = shallowRef<HTMLElement | null>(null);
const horizontalBar = shallowRef<HTMLElement | null>(null);
const verticalThumb = shallowRef<HTMLElement | null>(null);
const horizontalThumb = shallowRef<HTMLElement | null>(null);
const corner = shallowRef<HTMLElement | null>(null);
const showVerticalScrollbar = computed(() => props.axis !== "horizontal");
const showHorizontalScrollbar = computed(() => props.axis !== "vertical");

/**
 * Returns the native scrolling viewport.
 *
 * @returns The current scrollable element, or null before mount.
 */
function getViewportElement(): HTMLElement | null {
  return viewport.value;
}

const handleScroll = useScrollSync({
  root, viewport, content, corner,
  bars: { vertical: verticalBar, horizontal: horizontalBar },
  thumbs: { vertical: verticalThumb, horizontal: horizontalThumb }
}, (x, y) => emit("scroll", { x, y }));

/**
 * Scrolls the viewport to an explicit coordinate.
 *
 * @param details - Native scrolling coordinates and behavior.
 */
function scrollTo(details: ScrollToOptions): void {
  getViewportElement()?.scrollTo(details);
}

/**
 * Scrolls the viewport to one logical content edge.
 *
 * @param edge - Content edge that should become visible.
 * @param behavior - Native instant or smooth scrolling behavior.
 */
function scrollToEdge(
  edge: QuireKitScrollAreaEdge,
  behavior: ScrollBehavior = "smooth"
): void {
  const element = getViewportElement();
  if (element === null) return;

  const coordinates: ScrollToOptions = { behavior };
  if (edge === "top") coordinates.top = 0;
  if (edge === "bottom") coordinates.top = element.scrollHeight;
  if (edge === "left") coordinates.left = 0;
  if (edge === "right") coordinates.left = element.scrollWidth;
  element.scrollTo(coordinates);
}

defineExpose<Exposed>({ scrollTo, scrollToEdge, getViewportElement });
</script>

<template>
  <div
    :id="id"
    ref="root"
    data-scope="scroll-area"
    data-part="root"
    :class="[
      'qk-scroll-area',
      `qk-scroll-area--${axis}`,
      `qk-scroll-area--${scrollbarVisibility}`
    ]"
  >
    <div
      ref="viewport"
      data-scope="scroll-area"
      data-part="viewport"
      :role="label === undefined ? 'presentation' : 'region'"
      :aria-label="label"
      :tabindex="label === undefined ? undefined : 0"
      :class="['qk-scroll-area__viewport', viewportClass]"
      style="overflow: auto"
      @scroll.passive="handleScroll"
    >
      <div ref="content" data-scope="scroll-area" data-part="content" role="presentation" :class="['qk-scroll-area__content', contentClass]" style="min-width: fit-content">
        <slot />
      </div>
    </div>

    <div
      v-if="showVerticalScrollbar"
      ref="verticalBar"
      data-scope="scroll-area"
      data-part="scrollbar"
      data-orientation="vertical"
      :class="[
        'qk-scroll-area__scrollbar',
        'qk-scroll-area__scrollbar--vertical',
        `qk-scroll-area__scrollbar--${size}`
      ]"
      style="position: absolute; top: 0; bottom: 0; inset-inline-end: 0"
    >
      <div ref="verticalThumb" data-scope="scroll-area" data-part="thumb" data-orientation="vertical" class="qk-scroll-area__thumb" />
    </div>

    <div
      v-if="showHorizontalScrollbar"
      ref="horizontalBar"
      data-scope="scroll-area"
      data-part="scrollbar"
      data-orientation="horizontal"
      :class="[
        'qk-scroll-area__scrollbar',
        'qk-scroll-area__scrollbar--horizontal',
        `qk-scroll-area__scrollbar--${size}`
      ]"
      style="position: absolute; bottom: 0; inset-inline-start: 0; inset-inline-end: 0"
    >
      <div ref="horizontalThumb" data-scope="scroll-area" data-part="thumb" data-orientation="horizontal" class="qk-scroll-area__thumb" />
    </div>

    <div
      v-if="axis === 'both'"
      ref="corner"
      data-scope="scroll-area"
      data-part="corner"
      class="qk-scroll-area__corner"
      style="position: absolute; bottom: 0; inset-inline-end: 0; width: 0; height: 0"
    />
  </div>
</template>
