import { computed, nextTick, provide, ref, shallowRef } from "vue";
import type { ComputedRef, ShallowRef } from "vue";
import {
  resolveToolbarNavigationTarget,
  resolveToolbarTabStop
} from "../../components/toolbar/navigation";
import type {
  QuireKitToolbarDirection,
  QuireKitToolbarOrientation,
  QuireKitToolbarRovingItem
} from "../../components/toolbar/types";
import {
  toolbarContextKey,
  type QuireKitToolbarContext,
  type QuireKitToolbarItemRegistration
} from "./context";

/** Reactive root options supplied by the Vue Toolbar adapter. */
export interface QuireKitToolbarRootOptions {
  /** Returns the current layout and keyboard-navigation direction. */
  readonly orientation: () => QuireKitToolbarOrientation;
  /** Returns an explicit text direction when supplied by the host. */
  readonly direction: () => QuireKitToolbarDirection | undefined;
  /** Returns whether movement beyond an edge wraps. */
  readonly loopFocus: () => boolean;
}

/** Bindings used by the Vue Toolbar root template. */
export interface QuireKitToolbarRootBindings {
  /** Native toolbar element used to resolve DOM order and inherited direction. */
  readonly element: ShallowRef<HTMLElement | null>;
  /** Delegated keyboard handler for registered toolbar controls. */
  readonly handleKeydown: (event: KeyboardEvent) => void;
}

/**
 * Creates the native roving-focus scope for one Vue Toolbar root.
 *
 * @param options - Reactive orientation, direction, and edge-loop settings.
 * @returns Native root bindings consumed by the Toolbar template.
 */
export function useToolbarRoot(
  options: QuireKitToolbarRootOptions
): QuireKitToolbarRootBindings {
  const element = shallowRef<HTMLElement | null>(null);
  const currentItemId = ref<string>();
  const registrations = new Map<string, QuireKitToolbarItemRegistration>();
  const orientation: ComputedRef<QuireKitToolbarOrientation> = computed(
    options.orientation
  );

  /** @returns Mounted controls sorted by live DOM position. */
  function orderedRegistrations(): readonly QuireKitToolbarItemRegistration[] {
    return [...registrations.values()].sort((left, right) => {
      const leftElement = left.element.value;
      const rightElement = right.element.value;
      if (leftElement === null || rightElement === null || leftElement === rightElement) {
        return 0;
      }
      return leftElement.compareDocumentPosition(rightElement) & 4 ? -1 : 1;
    });
  }

  /** @returns DOM-ordered navigation items with live disabled state. */
  function navigationItems(): readonly QuireKitToolbarRovingItem[] {
    return orderedRegistrations().map((item) => ({
      id: item.id,
      disabled: item.isDisabled()
    }));
  }

  /** Keeps exactly one enabled control in the document Tab sequence. */
  function reconcileTabStop(): void {
    currentItemId.value = resolveToolbarTabStop(
      navigationItems(),
      currentItemId.value
    );
  }

  /** @param item - Mounted native control and its live disabled state. */
  function registerItem(item: QuireKitToolbarItemRegistration): void {
    registrations.set(item.id, item);
    reconcileTabStop();
  }

  /** @param itemId - Stable identity of the unmounted control. */
  function unregisterItem(itemId: string): void {
    registrations.delete(itemId);
    reconcileTabStop();
  }

  /**
   * @param itemId - Stable identity of the queried control.
   * @returns Zero for the current Tab stop, otherwise minus one.
   */
  function tabIndexFor(itemId: string): 0 | -1 {
    return currentItemId.value === itemId ? 0 : -1;
  }

  /** @param itemId - Stable identity of the focused control. */
  function setCurrentItem(itemId: string): void {
    const registration = registrations.get(itemId);
    if (registration !== undefined && !registration.isDisabled()) {
      currentItemId.value = itemId;
    }
  }

  /** @returns Explicit or inherited physical text direction. */
  function resolveDirection(): QuireKitToolbarDirection {
    const explicit = options.direction();
    if (explicit !== undefined) return explicit;
    return element.value !== null && getComputedStyle(element.value).direction === "rtl"
      ? "rtl"
      : "ltr";
  }

  /**
   * @param itemId - Stable identity of the event target.
   * @param key - Native KeyboardEvent key value.
   * @returns Whether this Toolbar owned and handled the key.
   */
  function moveFocus(itemId: string, key: string): boolean {
    const targetId = resolveToolbarNavigationTarget(
      navigationItems(),
      itemId,
      key,
      {
        orientation: options.orientation(),
        direction: resolveDirection(),
        loop: options.loopFocus()
      }
    );
    if (targetId === undefined) return false;
    currentItemId.value = targetId;
    void nextTick(() => registrations.get(targetId)?.element.value?.focus());
    return true;
  }

  /** @param event - Native key event bubbling from a toolbar control. */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const item = target.closest<HTMLElement>("[data-qk-toolbar-item]");
    if (item === null || item.closest('[role="toolbar"]') !== element.value) return;
    const itemId = item.dataset.qkToolbarItem;
    if (itemId !== undefined && moveFocus(itemId, event.key)) event.preventDefault();
  }

  const context: QuireKitToolbarContext = Object.freeze({
    orientation,
    registerItem,
    unregisterItem,
    reconcileTabStop,
    tabIndexFor,
    setCurrentItem,
    moveFocus
  });
  provide(toolbarContextKey, context);
  return Object.freeze({ element, handleKeydown });
}
