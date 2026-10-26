import { useDrawer, type UseDrawerProps } from "@ark-ui/vue/drawer";
import { computed, provide, ref } from "vue";
import { createDrawerCloseBoundary } from "./close-boundary";
import { drawerInteractionKey, drawerSideKey } from "./context";
import type { DrawerRuntime, DrawerRuntimeEvents, DrawerRuntimeIdentity, DrawerRuntimeProps } from "./types";

/**
 * Connects one guarded public model to Ark's existing focus and gesture machine.
 * @param props - Current public root properties.
 * @param events - Public model and task notifications.
 * @param identity - Optional private anatomy identity for a persistent external trigger.
 * @returns The Ark provider value and common imperative close entry.
 */
export function useDrawerRuntime(props: DrawerRuntimeProps, events: DrawerRuntimeEvents, identity?: DrawerRuntimeIdentity): DrawerRuntime {
  const internalOpen = ref(props.defaultOpen ?? false);
  const open = computed(() => props.open ?? internalOpen.value);
  // Zag 1.43.3 has no public drag rollback after a controlled veto; guarded tasks never start a drag.
  const dragEnabled = computed(() => props.dragEnabled !== false && props.onCloseRequest === undefined);
  const side = computed(() => props.side ?? "end");

  /** Commits uncontrolled state or requests the controlled model's matching transition. */
  function commitClose(): void {
    if (props.open === undefined) internalOpen.value = false;
    events.updateOpen(false);
    events.openChange(false);
  }

  const { requestClose } = createDrawerCloseBoundary({
    isOpen: () => open.value,
    notify: events.closeRequest,
    close: commitClose
  });

  const bindings = computed<UseDrawerProps>(() => ({
    ...(identity === undefined ? {} : { id: identity.id, ids: identity.ids }),
    open: open.value,
    swipeDirection: side.value === "bottom" ? "down" : side.value,
    role: props.role,
    modal: props.modal,
    trapFocus: props.trapFocus,
    preventScroll: props.preventScroll,
    restoreFocus: props.restoreFocus,
    closeOnEscape: props.closeOnEscape,
    closeOnInteractOutside: props.closeOnInteractOutside,
    snapPoints: props.snapPoints,
    snapToSequentialPoints: props.snapToSequentialPoints ?? false,
    preventDragOnScroll: props.preventDragOnScroll ?? true,
    ...(props.snapPoint === undefined ? {} : { snapPoint: props.snapPoint }),
    ...(props.defaultSnapPoint === undefined ? {} : { defaultSnapPoint: props.defaultSnapPoint }),
    ...(props.triggerValue === undefined ? {} : { triggerValue: props.triggerValue }),
    ...(props.defaultTriggerValue === undefined ? {} : { defaultTriggerValue: props.defaultTriggerValue }),
    ...(props.initialFocusEl === undefined ? {} : { initialFocusEl: props.initialFocusEl }),
    ...(props.finalFocusEl === undefined ? {} : { finalFocusEl: props.finalFocusEl }),
    /** @param event - Topmost-layer Escape request supplied by Zag. */
    onEscapeKeyDown(event) {
      if (!event.defaultPrevented && props.closeOnEscape !== false) requestClose("escape");
      event.preventDefault();
    },
    /** @param event - Outside interaction already filtered through Zag's nested layer stack. */
    onInteractOutside(event) {
      if (!event.defaultPrevented && props.closeOnInteractOutside !== false) requestClose("outside");
      event.preventDefault();
    },
    /** @param details - Gesture or opening transition from the original machine. */
    onOpenChange(details) {
      if (!details.open) {
        requestClose(drawer.value.dragging ? "swipe" : "programmatic");
        return;
      }
      if (props.open === undefined) internalOpen.value = true;
      events.updateOpen(true);
      events.openChange(true);
    },
    onSnapPointChange: events.snapPointChange,
    onTriggerValueChange: events.triggerValueChange
  }));
  const drawer = useDrawer(bindings);

  // Keep Ark anatomy and opening behavior while routing its public close entries through one task gate.
  const api = computed(() => ({
    ...drawer.value,
    /** @param next - Requested open state from a composed part. */
    setOpen(next: boolean) {
      if (next) drawer.value.setOpen(true);
      else requestClose("programmatic");
    },
    /** @returns Ark close anatomy with the common cancelable close entry. */
    getCloseTriggerProps() {
      return {
        ...drawer.value.getCloseTriggerProps(),
        /** @param event - Native or keyboard-generated button activation. */
        onClick(event: PointerEvent) {
          if (!event.defaultPrevented) requestClose("close-trigger");
        }
      };
    },
    /** @param options - Stable multi-trigger identity. @returns Ark trigger anatomy and opening behavior. */
    getTriggerProps(options?: Parameters<typeof drawer.value.getTriggerProps>[0]) {
      const trigger = drawer.value.getTriggerProps(options);
      return {
        ...trigger,
        /** @param event - Native or keyboard-generated trigger activation. */
        onClick(event: PointerEvent) {
          if (event.defaultPrevented) return;
          const switchesTrigger = options?.value !== undefined && options.value !== drawer.value.triggerValue;
          if (drawer.value.open && !switchesTrigger) requestClose("trigger");
          else trigger.onClick?.(event);
        }
      };
    }
  }));

  provide(drawerSideKey, side);
  provide(drawerInteractionKey, { dragEnabled, requestClose });
  return { api, requestClose };
}
