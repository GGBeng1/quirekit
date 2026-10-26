/**
 * Keeps a child beside the whole parent surface while aligning it with its row.
 * @param element - Trigger supplied by the floating-position lifecycle.
 * @returns A viewport anchor, or null while the trigger is not mounted.
 */
export function submenuAnchorRect(element: HTMLElement | null): DOMRect | null {
  if (!element) return null;
  const row = element.getBoundingClientRect();
  const parent = element.closest('[role="menu"]')?.getBoundingClientRect();
  return new DOMRect(parent?.left ?? row.left, row.top, parent?.width ?? row.width, row.height);
}
