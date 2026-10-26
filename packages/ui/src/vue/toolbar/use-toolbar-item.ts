import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useId,
  watch
} from "vue";
import type { QuireKitToolbarItemBindings } from "./items/types";
import { toolbarContextKey } from "./context";

/**
 * Registers one toolbar control and exposes its roving-focus bindings.
 *
 * @param isDisabled - Returns the control's current disabled state.
 * @returns Stable bindings for the native button rendered by the caller.
 */
export function useToolbarItem(
  isDisabled: () => boolean
): QuireKitToolbarItemBindings {
  const context = inject(toolbarContextKey);
  if (context === undefined) {
    throw new Error("Toolbar controls must be rendered inside QuireKit Toolbar");
  }
  const resolvedContext = context;
  const id = useId();
  const element = shallowRef<HTMLButtonElement | null>(null);
  const tabIndex = computed(() => resolvedContext.tabIndexFor(id));

  /** Makes this control the current Tab stop after native focus. */
  function handleFocus(): void {
    resolvedContext.setCurrentItem(id);
  }

  onMounted(() => {
    resolvedContext.registerItem({ id, element, isDisabled });
  });
  onBeforeUnmount(() => {
    resolvedContext.unregisterItem(id);
  });
  watch(isDisabled, () => {
    void nextTick(resolvedContext.reconcileTabStop);
  });

  return Object.freeze({ id, element, tabIndex, handleFocus });
}
