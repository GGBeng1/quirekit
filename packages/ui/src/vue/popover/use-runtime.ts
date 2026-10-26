import { useQuireOverlayHost } from "../overlay-provider";
import { usePopover, type PopoverOpenChangeDetails, type UsePopoverProps } from "@ark-ui/vue/popover";
import { computed, ref } from "vue";
import { useModalSurfaceOwner } from "../shared/surface/use-modal-owner";
import type { PopoverRuntime, PopoverRuntimeEvents, PopoverRuntimeIdentity, PopoverRuntimeInput } from "./types";

/**
 * Projects the existing Popover contract onto one reusable public Ark machine.
 * @param props - Reactive public values, separate from the optional private identity.
 * @param events - Original model and dismissal notifications.
 * @param identity - Stable anatomy ids for a trigger outside the provider branch.
 * @returns Reactive provider API retaining the existing modal-owner behavior.
 */
export function usePopoverRuntime(props: PopoverRuntimeInput, events: PopoverRuntimeEvents, identity?: PopoverRuntimeIdentity): PopoverRuntime {
  const portal = useQuireOverlayHost();
  const owner = useModalSurfaceOwner();
  const internalOpen = ref(props.defaultOpen ?? false);
  const bindings = computed<UsePopoverProps>(() => ({
    ...(identity === undefined ? {} : { id: identity.id, ids: identity.ids }),
    // A hidden owner suspends effects without replacing the consumer's open request.
    // Owned machines receive only effective open; explicit false wins over a default.
    ...(owner.present ? { defaultOpen: false } : props.open === undefined ? { defaultOpen: props.defaultOpen ?? false } : {}),
    ...(owner.present
      ? { open: owner.ready.value && (props.open ?? internalOpen.value) }
      : props.open === undefined ? {} : { open: props.open }),
    portalled: props.portalled ?? true,
    modal: props.modal ?? false,
    autoFocus: props.autoFocus ?? true,
    restoreFocus: (props.restoreFocus ?? true) && owner.open.value,
    closeOnEscape: props.closeOnEscape ?? true,
    closeOnInteractOutside: props.closeOnInteractOutside ?? true,
    positioning: {
      ...(portal.strategy.value ? { strategy: portal.strategy.value } : {}),
      placement: props.placement ?? "bottom-start",
      flip: true,
      slide: true,
      hideWhenDetached: props.hideWhenDetached ?? true
    },
    ...(props.initialFocusEl === undefined ? {} : { initialFocusEl: props.initialFocusEl }),
    ...(props.finalFocusEl === undefined ? {} : { finalFocusEl: props.finalFocusEl }),
    onOpenChange: handleOpenChange,
    onEscapeKeyDown: events.escapeKeyDown,
    onInteractOutside: events.interactOutside
  }));

  /** @param details - The original Ark machine's update request. */
  function handleOpenChange(details: PopoverOpenChangeDetails): void {
    if (owner.present && !owner.ready.value) return;
    internalOpen.value = details.open;
    events.updateOpen(details.open);
    events.openChange(details.open);
  }

  // The props callbacks are the sole event path; an additional emit adapter would duplicate requests.
  return { api: usePopover(bindings) };
}
