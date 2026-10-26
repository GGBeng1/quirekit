<script setup lang="ts">
import { Menu, useMenuContext } from "@ark-ui/vue/menu";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { trackContextMenuRegion } from "./anchor";
import { collectContextMenuSurfaces } from "./focus";
import { contextMenuKeyboardPoint, isContextMenuKey } from "./keyboard";

/** Adapter-owned context region and focus-return options. */
interface Props {
  /** Accessible name for the focusable context region. */
  readonly label: string;
  /** Whether custom context activation is unavailable. */
  readonly disabled: boolean;
  /** Whether unclaimed focus returns after dismissal. */
  readonly restoreFocus: boolean;
}

/** Visual content retained inside the stable context region. */
interface Slots {
  /** Non-interactive visual content for the context target. */
  readonly default: () => unknown;
}

defineOptions({ inheritAttrs: false });
const props = defineProps<Props>();
defineSlots<Slots>();
const menu = useMenuContext();
const element = ref<HTMLDivElement>();
let anchorOrigin: "region" | "pointer" | undefined;
let dispatchingRegion = false;
let stopRegionTracking: (() => void) | undefined;
let highlightOnOpen = false;

/** Dispatches the same local Ark context event for keyboard or controlled opening. */
function openAtRegion(): void {
  const target = element.value;
  const EventConstructor = target?.ownerDocument.defaultView?.MouseEvent;
  if (!target || !EventConstructor || props.disabled) return;
  const point = contextMenuKeyboardPoint(target.getBoundingClientRect());
  dispatchingRegion = true;
  try {
    target.dispatchEvent(new EventConstructor("contextmenu", {
      bubbles: true, cancelable: true, button: 2, clientX: point.x, clientY: point.y
    }));
  } finally { dispatchingRegion = false; }
}

/**
 * Bridges keyboard activation to Ark while allowing host-cancelled events.
 * @param event - Keyboard event on the context region.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (props.disabled || !isContextMenuKey(event)) return;
  event.preventDefault();
  event.stopPropagation();
  highlightOnOpen = true;
  openAtRegion();
  if (menu.value.open) void positionOpenMenu();
}

/**
 * Guards the local context handler before Ark receives its event.
 * @param event - A pointer context-menu event on this region.
 */
function prepareContext(event: MouseEvent): void {
  if (props.disabled) event.stopImmediatePropagation();
  else {
    anchorOrigin = dispatchingRegion ? "region" : "pointer";
    stopRegionTracking?.();
    if (menu.value.open && !dispatchingRegion) void positionOpenMenu();
  }
}

/**
 * Marks Ark's touch/pen long-press anchor without changing its timing behavior.
 * @param event - Pointer-down event captured by the region.
 */
function preparePointer(event: PointerEvent): void {
  if (props.disabled) event.stopImmediatePropagation();
  else if (event.pointerType !== "mouse") {
    anchorOrigin = "pointer";
    stopRegionTracking?.();
  }
}

/**
 * Clears a cancelled long-press anchor without disturbing mouse context events.
 * @param event - Pointer completion from the context region.
 */
function finishPointer(event: PointerEvent): void {
  if (event.pointerType !== "mouse" && !menu.value.open) anchorOrigin = undefined;
}

/**
 * Resolves controlled opening only after the context region and surface exist.
 * @returns A promise that settles after positioning has been requested.
 */
async function positionOpenMenu(): Promise<void> {
  await nextTick();
  if (!menu.value.open || props.disabled) return;
  if (!anchorOrigin) openAtRegion();
  stopRegionTracking?.();
  stopRegionTracking = anchorOrigin === "region" && element.value
    ? trackContextMenuRegion(element.value, (getAnchorRect) => menu.value.reposition({ getAnchorRect }))
    : undefined;
  if (anchorOrigin !== "region") menu.value.reposition();
  if (highlightOnOpen) {
    highlightOnOpen = false;
    const contentId = menu.value.getContentProps().id;
    const content = typeof contentId === "string" ? element.value?.ownerDocument.getElementById(contentId) : null;
    // The Menu API keeps virtual focus; inspect its rendered rows without focusing an item DOM node.
    const first = content?.querySelector<HTMLElement>('[role^="menuitem"][data-value]:not([data-disabled])');
    const value = first?.dataset.value;
    if (value !== undefined) menu.value.setHighlightedValue(value);
  }
}

/**
 * Returns focus only while it still belongs to this dismissed menu or the page.
 * @returns A promise that settles after pending machine focus and the DOM update.
 */
async function restoreRegionFocus(): Promise<void> {
  const target = element.value;
  const document = target?.ownerDocument;
  const window = document?.defaultView;
  if (!window) return;
  const contentId = menu.value.getContentProps().id;
  const content = typeof contentId === "string" ? document?.getElementById(contentId) : null;
  const surfaces = collectContextMenuSurfaces(content);
  // A selection handler may have handed focus to another task before closing.
  const claimedFocus = document?.activeElement;
  const destination = claimedFocus && claimedFocus !== document?.body && !surfaces.some(surface => surface.contains(claimedFocus))
    ? claimedFocus as HTMLElement
    : target;
  await nextTick();
  // Ark queues focusMenu on pointer movement. Let that already-queued frame finish
  // before restoring focus, so it cannot refocus the exiting surface afterwards.
  await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
  if (!target?.isConnected || !document || props.disabled || !props.restoreFocus || menu.value.open) return;
  const active = document.activeElement;
  if ((!active || active === document.body || surfaces.some(surface => surface.contains(active))) && destination?.isConnected) {
    destination.focus({ preventScroll: true });
  }
}

watch(() => menu.value.open, (open) => {
  if (open) void positionOpenMenu();
  else {
    anchorOrigin = undefined;
    stopRegionTracking?.();
    stopRegionTracking = undefined;
    highlightOnOpen = false;
    void restoreRegionFocus();
  }
});
onMounted(() => {
  if (menu.value.open) void positionOpenMenu();
});
onBeforeUnmount(() => stopRegionTracking?.());
</script>

<template>
  <Menu.ContextTrigger as-child>
    <div
      ref="element"
      v-bind="$attrs"
      class="qk-menu__context-trigger"
      role="group"
      :tabindex="disabled ? -1 : 0"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="menu.open"
      :aria-controls="menu.getContentProps().id"
      :aria-disabled="disabled || undefined"
      :data-disabled="disabled || undefined"
      @contextmenu.capture="prepareContext"
      @contextmenu.stop
      @pointerdown.capture="preparePointer"
      @pointerup.capture="finishPointer"
      @pointercancel.capture="finishPointer"
      @keydown="handleKeydown"
    ><slot /></div>
  </Menu.ContextTrigger>
</template>
