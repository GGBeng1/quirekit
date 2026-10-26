import { watch } from "vue";
import type { Ref } from "vue";
import type { UseMenuReturn } from "@ark-ui/vue/menu";
import { trackContextMenuRegion } from "../menu/context/anchor";
import { contextMenuKeyboardPoint } from "../menu/context/keyboard";

/**
 * Reuses context-menu observation while keeping each opening source's correct rectangle.
 * @param menu - Desktop machine, owning collisions and placement.
 * @param open - Whether this desktop surface is effective.
 * @param opener - Actual button or context region for this session.
 * @param origin - Button box, keyboard region edge, or pointer point.
 * @param point - Pointer coordinates captured from the native context event.
 */
export function useActionMenuAnchor(menu: UseMenuReturn, open: Readonly<Ref<boolean>>, opener: Ref<HTMLElement | undefined>, origin: Ref<"button" | "region" | "point">, point: Ref<{ x: number; y: number } | undefined>): void {
  watch([open, opener, origin, point], ([visible, target], _previous, onCleanup) => {
    if (!visible || !target) return;
    const stop = trackContextMenuRegion(target, () => menu.api.value.reposition({
      /** @returns The original source's rectangle in viewport coordinates. */
      getAnchorRect() {
        if (origin.value === "point" && point.value) return { ...point.value, width: 0, height: 0 };
        const rect = target.getBoundingClientRect();
        return origin.value === "region" ? { ...contextMenuKeyboardPoint(rect), width: 0, height: 0 } : rect;
      }
    }));
    onCleanup(stop);
  }, { flush: "post", immediate: true });
}
