<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import QuireThemePortal from "../theme-provider/portal.vue";
import { Menu } from "@ark-ui/vue/menu";
import { computed, onMounted, ref, useAttrs, type ComponentPublicInstance, type StyleValue } from "vue";
import type {
  MenuHighlightChangeDetails,
  MenuSelectionDetails
} from "@ark-ui/vue/menu";
import type { QuireKitMenuLength, QuireKitMenuAnchorPoint, QuireKitMenuEntry, QuireKitMenuInitialFocus } from "../../components/menu";
import QuireMenuItems from "./items/items.vue";
import { resolveViewportMenuContentStyle } from "./content-size";
import { useMenuLayerClass } from "./surface/use-layer";
import { useMenuInitialFocus } from "./initial-focus";
import { provideSubmenuSiblings } from "./surface/siblings";
import { provideMenuPortal } from "./surface/portal";
import { useNestedMenuScroll } from "./surface/scroll";
import MenuTrigger from "./surface/trigger.vue";

/** Placement values supported by the public Menu adapter. */
type MenuPlacement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end"
  | "left-start"
  | "left-end"
  | "right-start"
  | "right-end";

/** Public properties for the Vue Menu root adapter. */
interface Props {
  /** Ordered declarative entries; the default slot takes precedence when supplied. */
  readonly items?: readonly QuireKitMenuEntry[];
  /** Screen point for controlled semantic menus without a DOM trigger. */
  readonly anchorPoint?: QuireKitMenuAnchorPoint;
  /** Owning document container for the floating surface. */
  readonly portalTarget?: string | HTMLElement;
  /** 菜单的稳定标识，用于关联入口与内容。 */
  readonly id?: string;
  /** Accessible name announced for the menu content. */
  readonly ariaLabel?: string;
  /** Initial open state when the controlled open value is omitted. */
  readonly defaultOpen?: boolean;
  /** Whether opening focuses an embedded control or the menu navigation surface. */
  readonly initialFocus?: QuireKitMenuInitialFocus;
  /** Whether selecting an ordinary item closes the menu. */
  readonly closeOnSelect?: boolean;
  /** Whether ArrowDown from the final row returns to the first available row. */
  readonly loopFocus?: boolean;
  /** Whether printable keys move highlight by label prefix. */
  readonly typeahead?: boolean;
  /** Preferred placement around the trigger. */
  readonly placement?: MenuPlacement;
  /** Whether the floating positioner teleports to the document body. */
  readonly portalled?: boolean;
  /** Whether Menu owns floating placement; false lets a host position the public surface. */
  readonly positioned?: boolean;
  /** Fixed content width; use `auto` to size directly from content. */
  readonly width?: QuireKitMenuLength;
  /** Minimum content width that may continue growing with its rows. */
  readonly minWidth?: QuireKitMenuLength;
  /** Maximum content width after which labels truncate with an ellipsis. */
  readonly maxWidth?: QuireKitMenuLength;
}

/** Public events emitted by the Vue Menu root adapter. */
interface Emits {
  /** 用户执行普通条目或更改勾选、单选项时触发。 */
  readonly select: [value: string];
  /** 当前高亮条目变化时触发。 */
  readonly highlightChange: [value: string | null];
}

/** Public slots exposed by the Vue Menu root adapter. */
interface Slots {
  /** Single interactive element that opens the menu. */
  readonly trigger?: () => unknown;
  /** Menu groups, rows, separators, and nested menus. */
  readonly default?: () => unknown;
}

provideSubmenuSiblings();
const {
  id,
  items,
  anchorPoint,
  portalTarget,
  ariaLabel,
  defaultOpen = false,
  initialFocus = "auto",
  closeOnSelect = true,
  loopFocus = true,
  typeahead = true,
  placement = "bottom-start",
  portalled = true,
  positioned = true,
  width,
  minWidth,
  maxWidth
} = defineProps<Props>();
const portal = provideMenuPortal(() => portalTarget);
const overlayHost = useQuireOverlayHost();
defineOptions({ inheritAttrs: false });
const contentAttrs = useAttrs();
const emit = defineEmits<Emits>();
const open = defineModel<boolean | undefined>("open", { default: undefined });
const content = ref<ComponentPublicInstance | HTMLElement>();
useNestedMenuScroll(() => content.value, () => open.value ?? defaultOpen);
useMenuInitialFocus(() => content.value, () => open.value ?? defaultOpen, () => initialFocus);
const slots = defineSlots<Slots>();
const { layerClass, layerStyle, portalDisabled } = useMenuLayerClass(() => portalled, () => open.value ?? defaultOpen);
const surfaceKey = computed(() => anchorPoint === undefined
  ? "trigger"
  : `point:${anchorPoint.x}:${anchorPoint.y}`);
// Let each async boundary hydrate its own menu before joining the shared target.
const mounted = ref(false);
onMounted(() => { mounted.value = true; });

/** @returns Ark UI root properties with uncontrolled values omitted. */
const rootProps = computed(() => ({
  ...(id === undefined ? {} : { id }),
  ...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel }),
  // The initial default and the host-owned state are mutually exclusive inputs.
  ...(open.value === undefined ? { defaultOpen } : { open: open.value }),
  closeOnSelect,
  loopFocus,
  typeahead,
  ...(anchorPoint === undefined ? {} : { anchorPoint }),
  positioning: {
    placement,
    gutter: 6,
    flip: true,
    slide: true,
    overflowPadding: 8,
    strategy: overlayHost.strategy.value ?? "fixed" as const,
    ...(anchorPoint === undefined ? {} : {
      getAnchorRect: () => ({
        x: anchorPoint.x,
        y: anchorPoint.y,
        top: anchorPoint.y,
        right: anchorPoint.x,
        bottom: anchorPoint.y,
        left: anchorPoint.x,
        width: 0,
        height: 0
      })
    })
  }
}));
const contentStyle = computed(() => resolveViewportMenuContentStyle(
  width,
  minWidth,
  maxWidth
));

/**
 * Projects Ark UI selection details to the stable public value contract.
 *
 * @param details - Selection details emitted by the Zag menu machine.
 */
function handleSelect(details: MenuSelectionDetails): void {
  if (!items || slots.default) emit("select", details.value);
}

/**
 * Projects Ark UI highlight details to the stable public value contract.
 *
 * @param details - Highlight details emitted by the Zag menu machine.
 */
function handleHighlightChange(details: MenuHighlightChangeDetails): void {
  emit("highlightChange", details.highlightedValue);
}
</script>

<template>
  <Menu.Root
    :key="surfaceKey"
    v-bind="rootProps"
    lazy-mount
    unmount-on-exit
    @update:open="open = $event"
    @select="handleSelect"
    @highlight-change="handleHighlightChange"
  >
    <MenuTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </MenuTrigger>
    <Teleport :to="portal" :disabled="portalDisabled || !mounted">
      <QuireThemePortal>
        <component :is="positioned ? Menu.Positioner : 'div'" :class="positioned ? ['qk-menu__positioner', layerClass] : undefined" :style="layerStyle">
          <!-- Exit animation may retain the panel after close; it must no longer accept deferred focus. -->
          <Menu.Content
            ref="content"
            v-bind="contentAttrs"
            class="qk-menu qk-menu--viewport"
            :aria-label="ariaLabel"
            :inert="!(open ?? defaultOpen) || undefined"
            :style="[contentStyle, contentAttrs.style as StyleValue, !positioned && { transitionProperty: 'opacity' }]"
            data-qk-menu-content
          >
            <slot><QuireMenuItems v-if="items" :items="items" :close-on-select="closeOnSelect" :content-props="contentAttrs" @select="emit('select', $event)" /></slot>
          </Menu.Content>
        </component>
      </QuireThemePortal>
    </Teleport>
  </Menu.Root>
</template>
