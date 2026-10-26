import { useModalPortal } from "../../shared/surface/use-modal-portal";
import { inject, provide, type InjectionKey } from "vue";

const menuDepth: InjectionKey<number> = Symbol("QuireMenuDepth");

/**
 * Keeps body-portalled menus above their owning modal surface while preserving page overlay layers.
 * @param portalled - Whether the menu uses a body portal.
 * @param open - The menu's current open state.
 * @param nested - Whether this surface is a child of the enclosing menu.
 * @returns The owning-surface layer modifier and its portal lifecycle.
 */
export function useMenuLayerClass(portalled: () => boolean, open: () => boolean, nested = false) {
  const { hasModalOwner, disabled } = useModalPortal(portalled, open);
  const depth = nested ? inject(menuDepth, 0) + 1 : 0;
  provide(menuDepth, depth);
  // Teleport mount order is not menu order. Each child owns a higher paint layer.
  return {
    layerClass: hasModalOwner ? "qk-menu__positioner--modal" : undefined,
    layerStyle: { "--qk-menu-depth": depth },
    portalDisabled: disabled
  };
}
