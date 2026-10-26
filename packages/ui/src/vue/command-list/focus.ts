import { watchEffect } from "vue";

/** @param owner - External native focus owner. @param menuId - Stable menu identity. @param activeId - Currently highlighted enabled row. */
export function useCommandListFocus(owner: () => HTMLElement | null | undefined, menuId: string, activeId: () => string | undefined): void {
  watchEffect(cleanup => {
    const input = owner();
    if (!input) return;
    const attributes = { "aria-controls": menuId, "aria-activedescendant": activeId(), "aria-haspopup": "menu", "aria-expanded": "true" };
    const previous = Object.keys(attributes).map(name => [name, input.getAttribute(name)] as const);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined) input.removeAttribute(name); else input.setAttribute(name, value);
    }
    // Only retire attributes still owned by this list, preserving another
    // controller's later ownership if it took over before this effect stopped.
    cleanup(() => {
      for (const [name, value] of previous) {
        if (input.getAttribute(name) !== (attributes[name as keyof typeof attributes] ?? null)) continue;
        if (value === null) input.removeAttribute(name); else input.setAttribute(name, value);
      }
    });
  });
}
