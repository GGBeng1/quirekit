import { useHorizontalScroll } from "../../shared/horizontal-scroll/use-scroll";
import type { ToolbarScrollOptions, ToolbarScrollBindings } from "./types";

/** Keeps Toolbar's single keyboard scope while sharing native overflow geometry.
 * @param options - Existing Toolbar bindings.
 * @returns Scroll and focus bindings for its viewport.
 */
export function useToolbarScroll(options: ToolbarScrollOptions): ToolbarScrollBindings {
  return useHorizontalScroll({ root: options.root, direction: options.direction,
    enabled: () => options.orientation() === "horizontal" && options.overflow() === "scroll",
    ownsFocus: target => target.closest('[role="toolbar"]') === options.root.value });
}
