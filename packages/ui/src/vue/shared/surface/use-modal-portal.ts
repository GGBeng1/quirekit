import { computed } from "vue";
import { useModalSurfaceOwner } from "./use-modal-owner";

/**
 * Keeps closed popup DOM inside its modal owner until the popup is exposed.
 * This preserves DOM state while preventing the modal's outside-content isolation
 * from hiding a body portal before its controlling trigger is expanded.
 * @param portalled - Whether the consumer enables portal rendering.
 * @param open - The popup's current controlled or machine state.
 * @returns Modal ownership and the reactive Teleport disabled state.
 */
export function useModalPortal(portalled: () => boolean, open: () => boolean) {
  const owner = useModalSurfaceOwner();
  const hasModalOwner = owner.present;
  const disabled = computed(() => !portalled() || (hasModalOwner && (!open() || !owner.ready.value)));
  return { hasModalOwner, disabled };
}
