import { watch, type ComponentPublicInstance } from "vue";
import type { QuireKitMenuInitialFocus } from "../../components/menu";

/**
 * Applies an explicit menu-surface focus before the machine's default focus pass.
 * @param content - Current public Menu content instance, absent while unmounted.
 * @param open - Current effective visibility, including uncontrolled defaults.
 * @param policy - Opt-in initial focus; auto leaves the machine unchanged.
 */
export function useMenuInitialFocus(
  content: () => ComponentPublicInstance | HTMLElement | undefined,
  open: () => boolean,
  policy: () => QuireKitMenuInitialFocus
): void {
  watch([content, open, policy], ([instance, visible, initialFocus]) => {
    if (!visible || initialFocus !== "menu" || !instance) return;
    const element = "$el" in instance ? instance.$el as HTMLElement : instance;
    // Focus inside the content makes Ark preserve that target. Only opening or
    // mounting runs this path, so later Tab/arrow navigation is never reclaimed.
    if (element?.nodeType === 1 && element.isConnected) element.focus({ preventScroll: true });
  }, { flush: "post", immediate: true });
}
