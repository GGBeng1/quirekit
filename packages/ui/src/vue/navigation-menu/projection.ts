import type { QuireKitNavigationMenuItem } from './types';
/**
 * Resolves ancestry without treating an expanded group as the current page.
 * @param item - Original branch or leaf.
 * @param key - Host's current location.
 * @returns Whether this entry contains the current leaf.
 */
export function containsCurrent(item: QuireKitNavigationMenuItem, key?: string): boolean {
  return item.children ? item.children.some(child => containsCurrent(child, key)) : item.key === key;
}
/**
 * Removes stale/disabled expansion identities and enforces horizontal single-panel ownership.
 * @param items - Current source tree.
 * @param values - Requested expansion keys.
 * @param vertical - Whether nested disclosure groups are permitted.
 * @param disabled - Whether the whole navigation is unavailable.
 * @returns Stable, deduplicated valid expansion keys.
 */
export function normalizeExpansion(items: readonly QuireKitNavigationMenuItem[], values: readonly string[], vertical: boolean, disabled = false): string[] {
  if (disabled) return [];
  const available = new Set<string>();
  /** @param entries - Enabled branch descendants to inspect. */
  function visit(entries: readonly QuireKitNavigationMenuItem[]): void {
    for (const item of entries) {
      if (item.disabled || !item.children?.length) continue;
      available.add(item.key);
      if (vertical) visit(item.children);
    }
  }
  visit(items);
  const valid = [...new Set(values)].filter(key => available.has(key));
  return vertical ? valid : valid.slice(0, 1);
}

/**
 * Selects a wider reading surface only when supporting copy requires it.
 * @param items - Panel descendants.
 * @returns Whether the panel contains rich descriptions.
 */
export function hasDescription(items: readonly QuireKitNavigationMenuItem[]): boolean {
  return items.some(item => Boolean(item.description) || Boolean(item.children && hasDescription(item.children)));
}
