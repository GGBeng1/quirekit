<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import QuireThemePortal from "../theme-provider/portal.vue";
import { Menu, useMenu, type UseMenuProps } from "@ark-ui/vue/menu";
import { computed, nextTick, ref, watch } from "vue";
import type { HTMLAttributes, ComponentPublicInstance } from "vue";
import type {
  QuireKitMenuItemTone,
  QuireKitMenuLength
} from "../../components/menu";
import { resolveSubmenuContentStyle } from "./content-size";
import { useMenuLayerClass } from "./surface/use-layer";
import { useSubmenuSiblings } from "./surface/siblings";
import { submenuAnchorRect } from "./surface/anchor";
import { provideMenuPortal } from "./surface/portal";
import { useNestedMenuScroll } from "./surface/scroll";

/** Public properties for a nested Menu. */
interface Props {
  /** Theme, language and owner attributes for the teleported child content. */
  readonly contentProps?: HTMLAttributes;
  /** 子菜单的稳定标识。 */
  readonly id?: string;
  /** Visual role of the submenu trigger row. */
  readonly tone?: QuireKitMenuItemTone;
  /** Whether the child positioner teleports to the inherited menu portal. */
  readonly portalled?: boolean;
  /** Whether an icon-free trigger reserves the leading indicator column. */
  readonly inset?: boolean;
  /** Fixed child-menu width; use `auto` to size directly from content. */
  readonly width?: QuireKitMenuLength;
  /** Minimum child-menu width that may continue growing with its rows. */
  readonly minWidth?: QuireKitMenuLength;
  /** Maximum child-menu width after which labels truncate with an ellipsis. */
  readonly maxWidth?: QuireKitMenuLength;
  /** Additional class on the existing submenu trigger row. */
  readonly triggerClass?: string;
  /** Additional class on the existing child menu surface. */
  readonly contentClass?: string;
}

/** Public slots exposed by a nested Menu. */
interface Slots {
  /** Visible label of the parent-menu trigger row. */
  readonly trigger: () => unknown;
  /** Optional leading icon for the trigger row. */
  readonly leading?: () => unknown;
  /** Child menu rows. */
  readonly default: () => unknown;
}

/** Public events emitted by this submenu's own accepted selections. */
interface Emits {
  /** 用户执行当前子菜单中的可用条目时触发，包含再次选择当前单选项。 */
  readonly select: [value: string];
}

const overlayHost = useQuireOverlayHost();
const {
  id,
  tone = "neutral",
  portalled = true,
  inset = false,
  width,
  minWidth,
  maxWidth,
  triggerClass,
  contentClass,
  contentProps
} = defineProps<Props>();
const open = defineModel<boolean | undefined>("open", { default: undefined });
const emit = defineEmits<Emits>();
const portal = provideMenuPortal(() => undefined);
defineSlots<Slots>();
const trigger = ref<ComponentPublicInstance | HTMLElement>();
const content = ref<ComponentPublicInstance | HTMLElement>();

/** @returns Child Menu root properties with uncontrolled values omitted. */
const rootProps = computed<UseMenuProps>(() => ({
  ...(id === undefined ? {} : { id }),
  ...(open.value === undefined ? {} : { open: open.value }),
  positioning: {
    placement: "right-start" as const,
    // Zag resets nested gutter to zero. The explicit offset retains our surface gap.
    offset: { mainAxis: 6 },
    getAnchorRect: element => submenuAnchorRect(element instanceof HTMLElement ? element : null),
    // Portalled theme bridges have their own absolute box. Submenus share the
    // root Menu's viewport coordinates so focus cannot scroll the page to it.
    strategy: overlayHost.strategy.value ?? "fixed" as const, flip: true, slide: true, overlap: false, overflowPadding: 8
  },
  loopFocus: true,
  typeahead: true,
  onEscapeKeyDown: closeCurrentLevel,
  /** @param details - Accepted leaf activation, independent of a radio group's value change. */
  onSelect(details) { emit("select", details.value); },
  /** @param details - Submenu request acknowledged by the public model. */
  onOpenChange(details) { open.value = details.open; }
}));
const menu = useMenu(rootProps);
useNestedMenuScroll(() => content.value, () => menu.api.value.open);
const { layerClass, layerStyle, portalDisabled } = useMenuLayerClass(() => portalled, () => menu.api.value.open, true);
const closeSiblings = useSubmenuSiblings(() => {
  if (menu.api.value.open) menu.api.value.setOpen(false);
});
watch(() => menu.api.value.open, visible => { if (visible) closeSiblings(); });

/**
 * Gives Escape the same single-level close and parent focus path as ArrowLeft.
 * The versioned Zag patch honors cancellation before its default root-menu close.
 * @param event - The existing Ark dismissable layer's Escape notification.
 */
function closeCurrentLevel(event: KeyboardEvent): void {
  event.preventDefault();
  menu.machine.send({ type: "ARROW_LEFT" });
  focusParentContent();
}

/** Returns to the parent menu's active descendant, even when it contains a toolbar or fields. */
function focusParentContent(): void {
  const instance = trigger.value;
  const element = instance && "$el" in instance ? instance.$el as HTMLElement : instance;
  element?.closest<HTMLElement>('[role="menu"]')?.focus({ preventScroll: true });
}

/** @param event - ArrowLeft from this menu's navigation surface, after Ark closes this level. */
function returnFromChild(event: KeyboardEvent): void {
  if (event.key === "ArrowLeft" && event.target === event.currentTarget) focusParentContent();
}

// Resolve the initial active descendant after lazy content exists. Controlled
// opens and rapid reopens must receive the same available first item as native
// submenu opening, while preserving any highlight already chosen by Ark.
watch(() => menu.api.value.open, (visible, _previous, onCleanup) => {
  if (!visible) return;
  let current = true;
  onCleanup(() => { current = false; });
  void nextTick(() => {
    if (!current || !menu.api.value.open || menu.api.value.highlightedValue != null) return;
    const instance = content.value;
    const element = instance && "$el" in instance ? instance.$el as HTMLElement : instance;
    if (element?.nodeType !== 1) return;
    const first = Array.from(element.querySelectorAll<HTMLElement>('[role^="menuitem"][data-value]'))
      .find(item => !item.hasAttribute("data-disabled") && item.getAttribute("aria-disabled") !== "true"
        && item.closest('[data-scope="menu"][data-part="content"]') === element);
    if (first?.dataset.value !== undefined) menu.api.value.setHighlightedValue(first.dataset.value);
  });
}, { flush: "post", immediate: true });
const contentStyle = computed(() => resolveSubmenuContentStyle(
  width,
  minWidth,
  maxWidth
));
</script>

<template>
  <Menu.RootProvider
    :value="menu"
    lazy-mount
    unmount-on-exit
  >
    <Menu.TriggerItem
      ref="trigger"
      :data-tone="tone"
      :class="['qk-menu__item', 'qk-menu__submenu-trigger', triggerClass]"
    >
      <span v-if="$slots.leading || inset" class="qk-menu__indicator" aria-hidden="true">
        <slot name="leading" />
      </span>
      <span class="qk-menu__label"><slot name="trigger" /></span>
      <span class="qk-menu__disclosure" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 3.5 4.5 4.5L6 12.5" />
        </svg>
      </span>
    </Menu.TriggerItem>
    <Teleport :to="portal" :disabled="portalDisabled">
      <QuireThemePortal>
        <Menu.Positioner :class="['qk-menu__positioner', layerClass]" :style="layerStyle">
          <Menu.Content
            v-bind="contentProps"
            ref="content"
            :class="['qk-menu', 'qk-menu--viewport', contentClass]"
            :style="[contentProps?.style, contentStyle]"
            data-qk-submenu-content
            @keydown="returnFromChild"
          >
            <slot />
          </Menu.Content>
        </Menu.Positioner>
      </QuireThemePortal>
    </Teleport>
  </Menu.RootProvider>
</template>
