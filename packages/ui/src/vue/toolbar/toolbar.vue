<script setup lang="ts">
import { computed, provide, shallowRef } from "vue";
import type { QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "../../components/toolbar/types";
import type { QuireKitToolbarProps as Props, QuireKitToolbarSlots as Slots } from "./types";
import ToolbarBody from "./items/body.vue";
import { useToolbarRoot } from "./use-toolbar-root";
import { toolbarLabelsKey, toolbarMobileKey, toolbarSizingKey } from "./context";
import { useToolbarMobile } from "./presentation/mode";
import { useToolbarScroll } from "./scrolling/use-scroll";
import { useToolbarCollapse } from "./collapse/use-collapse";
import ToolbarMore from "./collapse/more.vue";
import QuireIcon from "../icon/icon.vue";
import ToolbarTooltip from "./presentation/tooltip.vue";
import { toolbarScrollLeftIcon, toolbarScrollRightIcon } from "./scrolling/icons";
import { useQuireKitMessages } from "../locale-provider/context";

// Public contracts live beside the root; this file owns only mounted behavior.

const {
  label,
  items,
  rows,
  renderers = {},
  context,
  preserveFocus = false,
  variant = "plain",
  mode = "desktop",
  overflowPortalTarget,
  overflowRestoreFocus = true,
  orientation = "horizontal",
  overflow,
  scrollbar = "hidden",
  align = "center",
  dir,
  loopFocus = true,
  id,
  sizing = "natural",
  unitsPerRow
} = defineProps<Props>();
const text = useQuireKitMessages("toolbar");
provide(toolbarSizingKey, computed(() => sizing));
const slots = defineSlots<Slots>();
const multirow = computed(() => !slots.default && rows !== undefined);
const resolvedOrientation = computed(() => multirow.value ? "horizontal" : orientation);
const emit = defineEmits<{
  /** Complete command intent for application or editor adapters. */
  execute: [event: QuireKitToolbarExecuteEvent];
  /** Popup transition; controlled entries write expanded back. */
  openChange: [event: QuireKitToolbarOpenChangeEvent];
  /** Overflow session and its original native trigger, before modal focus moves. */
  overflowOpenChange: [open: boolean, trigger: HTMLElement | null];
  /** Physical overflow mount/release for owner-local obstruction and focus interop. */
  overflowContentElementChange: [element: HTMLElement | null];
  /** Immediate action or nested menu command requested once. */
  select: [value: string];
  /** Host applies the requested toggle state to its data. */
  toggle: [value: string, pressed: boolean];
}>();
const root = useToolbarRoot({
  orientation: () => resolvedOrientation.value,
  direction: () => dir,
  loopFocus: () => loopFocus
});
const mobile = useToolbarMobile(root.element, () => mode);
provide(toolbarMobileKey, mobile);
provide(toolbarLabelsKey, computed(() => mobile.value && resolvedOrientation.value === "vertical"));
const effectiveOverflow = computed(() => overflow ?? (mobile.value && items !== undefined && !slots.default && rows === undefined ? "collapse" : "scroll"));
const overflowOpen = shallowRef(false), overflowSurface = shallowRef<HTMLElement | null>(null);
const scrolling = useToolbarScroll({
  root: root.element,
  orientation: () => resolvedOrientation.value,
  overflow: () => effectiveOverflow.value,
  direction: () => dir
});

// Collapse applies to configured single-row items; slots and explicit rows keep their own layout.
const collapsing = computed(() => (effectiveOverflow.value === "collapse" || overflowOpen.value || overflowSurface.value !== null) && resolvedOrientation.value === "horizontal" && !slots.default && rows === undefined && items !== undefined);
const collapse = useToolbarCollapse({ root: root.element, enabled: () => collapsing.value, items: () => items ?? [],
  paused: () => overflowOpen.value || overflowSurface.value !== null, metrics: () => mobile.value });

/** @param open - Accepted overflow task state. @param trigger - Original operation entry. */
function overflowChanged(open: boolean, trigger: HTMLElement | null): void { overflowOpen.value = open; emit("overflowOpenChange", open, trigger); }
/** @param element - Physical surface; retain collapse identity through its closing animation. */
function overflowMounted(element: HTMLElement | null): void { overflowSurface.value = element; emit("overflowContentElementChange", element); }

/** @param event - Mouse press on a presentation-only scroll arrow. */
function preserveScrollFocus(event: PointerEvent): void {
  if (event.pointerType === "mouse" && event.button === 0) event.preventDefault();
}
/** @param event - Accepted intent from one configured control. */
function execute(event: QuireKitToolbarExecuteEvent): void {
  emit("execute", event);
  if (event.source === "toggle") emit("toggle", event.value, event.pressed === true);
  else emit("select", event.value);
}
/** @param event - Pointer press; popup inputs and touch interaction retain native focus. */
function preserveHostFocus(event: PointerEvent): void {
  if (!preserveFocus || event.pointerType !== "mouse" || event.button !== 0) return;
  const target = event.target;
  if (target instanceof Element && target.closest("[data-qk-toolbar-item]")?.closest('[role="toolbar"]') === event.currentTarget) event.preventDefault();
}
</script>

<template>
  <div
    :id="id"
    :ref="(element) => { root.element.value = element as HTMLElement | null }"
    role="toolbar"
    :aria-label="label"
    :aria-orientation="resolvedOrientation"
    :dir="dir"
    :class="['qk-toolbar', `qk-toolbar--${resolvedOrientation}`, `qk-toolbar--${variant}`, mobile && 'qk-toolbar--mobile', resolvedOrientation === 'horizontal' && `qk-toolbar--align-${align}`, unitsPerRow !== undefined && 'qk-toolbar--wrap', collapsing && 'qk-toolbar--collapse']"
    :style="unitsPerRow === undefined ? undefined : { '--qk-toolbar-units-per-row': String(unitsPerRow) }"
    :data-overflowing="scrolling.overflowing.value"
    @keydown="root.handleKeydown"
    @pointerdown="preserveHostFocus"
    @focusin="scrolling.revealFocused"
  >
    <ToolbarTooltip v-if="scrolling.overflowing.value" :label="text.scrollPrevious">
    <button type="button" tabindex="-1"
      class="qk-toolbar__item qk-toolbar__scroll-button" data-qk-toolbar-scroll="previous"
      :aria-label="text.scrollPrevious" :disabled="!scrolling.canPrevious.value"
      @pointerdown="preserveScrollFocus" @click="scrolling.scrollPage(-1)">
      <QuireIcon :data="scrolling.rtl.value ? toolbarScrollRightIcon : toolbarScrollLeftIcon" />
    </button>
    </ToolbarTooltip>
    <div :ref="element => { scrolling.viewport.value = element as HTMLElement | null }"
      data-qk-toolbar-viewport :class="['qk-toolbar__viewport', scrolling.enabled.value ? `qk-toolbar__viewport--${scrollbar}` : 'qk-toolbar__viewport--visible']"
      @scroll.passive="scrolling.updateEdges" @wheel="scrolling.handleWheel">
    <div :ref="element => { scrolling.content.value = element as HTMLElement | null }"
      data-qk-toolbar-content :class="['qk-toolbar__content', multirow && 'qk-toolbar__content--rows', !scrolling.enabled.value && !multirow && 'qk-toolbar__content--visible']">
    <slot>
      <ToolbarBody :items="collapsing ? collapse.visible.value : items" :rows="rows" :context="context" :renderers="renderers" :units="collapsing"
        @execute="execute" @open-change="emit('openChange', $event)">
        <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
        <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
      </ToolbarBody>
      <ToolbarMore v-if="collapse.collapsed.value.length > 0" :label="text.more" :items="collapse.collapsed.value" :context="context" :renderers="renderers" :mobile="mobile" :portal-target="overflowPortalTarget" :restore-focus="overflowRestoreFocus"
        @execute="execute" @open-change="emit('openChange', $event)" @panel-open-change="overflowChanged" @surface-change="overflowMounted">
        <template v-if="$slots.item" #item="scope"><slot name="item" v-bind="scope" /></template>
        <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
      </ToolbarMore>
    </slot>
    </div>
    </div>
    <ToolbarTooltip v-if="scrolling.overflowing.value" :label="text.scrollNext">
    <button type="button" tabindex="-1"
      class="qk-toolbar__item qk-toolbar__scroll-button" data-qk-toolbar-scroll="next"
      :aria-label="text.scrollNext" :disabled="!scrolling.canNext.value"
      @pointerdown="preserveScrollFocus" @click="scrolling.scrollPage(1)">
      <QuireIcon :data="scrolling.rtl.value ? toolbarScrollLeftIcon : toolbarScrollRightIcon" />
    </button>
    </ToolbarTooltip>
  </div>
</template>
