<script setup lang="ts">
import { useQuireOverlayHost } from "../../overlay-provider";
import QuireThemePortal from "../../theme-provider/portal.vue";
import { Menu } from "@ark-ui/vue/menu";
import type { MenuHighlightChangeDetails, MenuSelectionDetails } from "@ark-ui/vue/menu";
import { computed, ref, useId, watch } from "vue";
import type { QuireKitContextMenuProps, QuireKitContextMenuSlotProps } from "../../../components/menu";
import { resolveViewportMenuContentStyle } from "../content-size";
import { useMenuLayerClass } from "../surface/use-layer";
import { provideSubmenuSiblings } from "../surface/siblings";
import QuireMenuItems from "../items/items.vue";
import ContextTrigger from "./trigger.vue";

/** Selection and highlight events shared with ordinary Menu consumers. */
interface Emits {
  /** 已选择条目的 value。 */
  readonly select: [value: string];
  /** 当前高亮条目，与选中值独立。 */
  readonly highlightChange: [value: string | null];
  /** 打开状态变化时触发。 */
  readonly openChange: [open: boolean];
}

/** Context target and the existing Menu-family composition surface. */
interface Slots {
  /** 操作区域内的图文内容，不放置独立交互控件。 */
  readonly trigger: (props: QuireKitContextMenuSlotProps) => unknown;
  /** Menu items, groups, options, separators, and submenus. */
  readonly default?: () => unknown;
}

defineOptions({ inheritAttrs: false });
provideSubmenuSiblings();
const overlayHost = useQuireOverlayHost();
const props = withDefaults(defineProps<QuireKitContextMenuProps>(), {
  defaultOpen: false,
  disabled: false,
  closeOnSelect: true,
  loopFocus: true,
  typeahead: true,
  placement: "bottom-start",
  portalled: true,
  restoreFocus: true
});
const emit = defineEmits<Emits>();
const open = defineModel<boolean | undefined>("open", { default: undefined });
const slots = defineSlots<Slots>();
const instanceId = useId();
const internalOpen = ref(props.disabled ? false : props.defaultOpen);
const visible = computed(() => !props.disabled && (open.value ?? internalOpen.value));
const { layerClass, layerStyle, portalDisabled } = useMenuLayerClass(() => props.portalled, () => visible.value);
const machineId = computed(() => props.id ?? instanceId);
const triggerId = computed(() => props.triggerId ?? `qk-context-${machineId.value}-trigger`);
const rootProps = computed(() => ({
  id: machineId.value,
  ids: { contextTrigger: triggerId.value },
  "aria-label": props.label,
  open: visible.value,
  closeOnSelect: props.closeOnSelect,
  loopFocus: props.loopFocus,
  typeahead: props.typeahead,
  positioning: {
    placement: props.placement, gutter: 2, flip: true, slide: true, overflowPadding: 8,
    strategy: overlayHost.strategy.value ?? "fixed" as const
  }
}));
const contentStyle = computed(() => resolveViewportMenuContentStyle(props.width, props.minWidth, props.maxWidth));

/**
 * Synchronizes controlled or local visibility without changing target content.
 * @param nextOpen - Opening state requested by Ark or trigger availability.
 */
function updateOpen(nextOpen: boolean): void {
  const next = !props.disabled && nextOpen;
  internalOpen.value = next;
  open.value = next;
  emit("openChange", next);
}

/**
 * Projects selection onto the same public event used by Menu.
 * @param details - Accepted Ark selection details.
 */
function handleSelect(details: MenuSelectionDetails): void {
  if (!props.items || slots.default) emit("select", details.value);
}

/**
 * Projects highlight without conflating it with an activated command.
 * @param details - Current Ark highlighted row.
 */
function handleHighlight(details: MenuHighlightChangeDetails): void {
  emit("highlightChange", details.highlightedValue);
}

watch(() => props.disabled, (disabled) => {
  if (disabled) updateOpen(false);
});
</script>

<template>
  <Menu.Root
    v-bind="rootProps" lazy-mount unmount-on-exit
    @update:open="updateOpen" @select="handleSelect" @highlight-change="handleHighlight"
  >
    <ContextTrigger v-bind="$attrs" :id="triggerId" :label="label" :disabled="disabled" :restore-focus="restoreFocus">
      <slot name="trigger" :open="visible" :disabled="disabled" />
    </ContextTrigger>
    <Teleport :to="overlayHost.target.value" :disabled="portalDisabled">
      <QuireThemePortal>
        <Menu.Positioner :class="['qk-menu__positioner', layerClass]" :style="layerStyle">
          <Menu.Content class="qk-menu qk-menu--context" :style="contentStyle" data-qk-menu-content data-qk-context-menu-content>
            <slot><QuireMenuItems v-if="items" :items="items" :close-on-select="closeOnSelect" @select="emit('select', $event)" /></slot>
          </Menu.Content>
        </Menu.Positioner>
      </QuireThemePortal>
    </Teleport>
  </Menu.Root>
</template>
