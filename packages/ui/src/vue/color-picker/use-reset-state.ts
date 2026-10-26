import { computed, nextTick, ref } from "vue";

/**
 * Keeps the absence of a document color separate from the editable CSS color.
 * @param controlled - Explicit no-color state, or undefined for local state.
 * @param update - Reports changes requested by a color or reset action.
 * @returns Current no-color state and its update entry.
 */
export function useColorResetState(controlled: () => boolean | undefined, update: (value: boolean) => void) {
  const local = ref(false);
  let pending: boolean | undefined;
  const resetActive = computed(() => controlled() ?? local.value);
  /** @param value - Whether the current document color is absent. */
  function setResetActive(value: boolean): void {
    if ((pending ?? resetActive.value) === value) return;
    // Ark value updates and palette commit can describe one action before controlled props echo back.
    pending = value;
    local.value = value;
    update(value);
    void nextTick(() => { pending = undefined; });
  }
  return { resetActive, setResetActive };
}
