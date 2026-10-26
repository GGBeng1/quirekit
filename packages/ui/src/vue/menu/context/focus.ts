const contentSelector = '[data-scope="menu"][data-part="content"]';

/**
 * Captures a menu's portalled descendants before closing removes their triggers.
 * @param root - The context menu surface whose focus ownership is ending.
 * @returns Surfaces belonging to this menu tree, excluding unrelated open menus.
 */
export function collectContextMenuSurfaces(root: HTMLElement | null | undefined): readonly HTMLElement[] {
  if (!root) return [];
  const surfaces = [root];
  for (const candidate of root.ownerDocument.querySelectorAll<HTMLElement>(contentSelector)) {
    if (candidate === root) continue;
    let current: HTMLElement | null | undefined = candidate;
    const visited = new Set<HTMLElement>();
    while (current && current !== root && !visited.has(current)) {
      visited.add(current);
      // Submenu labels point to their trigger row in the parent surface, even across Teleports.
      current = current.getAttribute("aria-labelledby")?.split(/\s+/u)
        .map(id => root.ownerDocument.getElementById(id)?.closest<HTMLElement>(contentSelector))
        .find(parent => parent !== undefined && parent !== null);
    }
    if (current === root) surfaces.push(candidate);
  }
  return surfaces;
}
