/**
 * Recognizes local context-menu shortcuts without taking other key combinations.
 *
 * @param event - Keyboard state received by the owned context region.
 * @returns Whether this event should open the region's context menu.
 */
export function isContextMenuKey(event: Pick<KeyboardEvent,
  "key" | "shiftKey" | "altKey" | "ctrlKey" | "metaKey" | "repeat" | "isComposing" | "defaultPrevented"
>): boolean {
  if (event.defaultPrevented || event.repeat || event.isComposing) return false;
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  return (event.key === "F10" && event.shiftKey) || (event.key === "ContextMenu" && !event.shiftKey);
}

/**
 * Uses the context region's lower leading edge for keyboard-originated menus.
 *
 * @param bounds - The region's viewport-space bounds.
 * @returns A viewport-space point consumed by Ark's existing context-menu event.
 */
export function contextMenuKeyboardPoint(bounds: Pick<DOMRect, "left" | "bottom">) {
  return { x: bounds.left, y: bounds.bottom };
}
