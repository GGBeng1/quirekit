import type {
  QuireKitToolbarNavigationOptions,
  QuireKitToolbarRovingItem
} from "./types";

/**
 * Resolves the single enabled toolbar item that owns the initial Tab stop.
 *
 * @param items - DOM-ordered toolbar items.
 * @param preferredId - Item that previously owned the Tab stop.
 * @returns Stable enabled item id, or undefined when every item is disabled.
 */
export function resolveToolbarTabStop(
  items: readonly QuireKitToolbarRovingItem[],
  preferredId?: string
): string | undefined {
  const preferred = items.find(
    (item) => item.id === preferredId && item.disabled !== true
  );
  return preferred?.id ?? items.find((item) => item.disabled !== true)?.id;
}

/**
 * Resolves a toolbar-owned keyboard movement while skipping disabled controls.
 *
 * Home and End always reach the first and last enabled item. Horizontal arrows
 * mirror in RTL, while vertical toolbars own ArrowUp and ArrowDown.
 *
 * @param items - DOM-ordered toolbar items.
 * @param currentId - Item that dispatched the keyboard event.
 * @param key - Native KeyboardEvent key value.
 * @param options - Orientation, direction, and edge-loop policy.
 * @returns Target item id, or undefined when the toolbar does not own the key.
 */
export function resolveToolbarNavigationTarget(
  items: readonly QuireKitToolbarRovingItem[],
  currentId: string,
  key: string,
  options: QuireKitToolbarNavigationOptions
): string | undefined {
  const enabledItems = items.filter((item) => item.disabled !== true);
  if (enabledItems.length === 0) return undefined;
  if (key === "Home") return enabledItems[0]?.id;
  if (key === "End") return enabledItems.at(-1)?.id;

  const movement = resolveMovement(key, options);
  if (movement === undefined) return undefined;
  const currentIndex = enabledItems.findIndex((item) => item.id === currentId);
  const startIndex = currentIndex < 0 ? 0 : currentIndex;
  const candidate = startIndex + movement;
  if (candidate >= 0 && candidate < enabledItems.length) {
    return enabledItems[candidate]?.id;
  }
  if (options.loop === false) return enabledItems[startIndex]?.id;
  return movement > 0 ? enabledItems[0]?.id : enabledItems.at(-1)?.id;
}

/**
 * Maps an owned arrow key to previous or next movement.
 *
 * @param key - Native KeyboardEvent key value.
 * @param options - Toolbar orientation and text direction.
 * @returns Negative or positive movement, or undefined for an unowned key.
 */
function resolveMovement(
  key: string,
  options: QuireKitToolbarNavigationOptions
): -1 | 1 | undefined {
  if (options.orientation === "vertical") {
    if (key === "ArrowUp") return -1;
    if (key === "ArrowDown") return 1;
    return undefined;
  }
  const direction = options.direction ?? "ltr";
  if (key === "ArrowLeft") return direction === "rtl" ? 1 : -1;
  if (key === "ArrowRight") return direction === "rtl" ? -1 : 1;
  return undefined;
}
