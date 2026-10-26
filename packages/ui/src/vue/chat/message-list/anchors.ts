import type { ReadingAnchor } from './types';

/** Capture the first visible item plus adjacent fallbacks with logarithmic DOM reads.
 * @param keys - Ordered stable identities.
 * @param nodes - Mounted item wrappers in the same order.
 * @param viewport - Native scroll viewport.
 * @returns Up to three key/offset anchors, preferred visible item first.
 */
export function captureAnchors(keys: readonly string[], nodes: ReadonlyMap<string, HTMLElement>, viewport: HTMLElement): ReadingAnchor[] {
  const top = viewport.getBoundingClientRect().top;
  let low = 0; let high = keys.length;
  // Item wrappers remain in DOM order; find the first bottom below viewport top.
  while (low < high) {
    const middle = (low + high) >>> 1;
    const node = nodes.get(keys[middle]!);
    if (node && node.getBoundingClientRect().bottom <= top) low = middle + 1;
    else high = middle;
  }
  return [low, low + 1, low - 1].flatMap(index => {
    const key = keys[index]; const node = key === undefined ? undefined : nodes.get(key);
    return key !== undefined && node ? [{ key, offset: node.getBoundingClientRect().top - top }] : [];
  });
}

/** Restore a surviving item, including when prepend or media changed earlier heights.
 * @param anchors - Previous visible item and neighboring fallbacks.
 * @param nodes - Current mounted wrappers.
 * @param viewport - Native scroll viewport; browser clamps writes to the available range.
 */
export function restoreAnchor(anchors: readonly ReadingAnchor[], nodes: ReadonlyMap<string, HTMLElement>, viewport: HTMLElement): void {
  const anchor = anchors.find(item => nodes.has(item.key));
  const node = anchor && nodes.get(anchor.key);
  if (!anchor || !node) return;
  const delta = node.getBoundingClientRect().top - viewport.getBoundingClientRect().top - anchor.offset;
  if (Math.abs(delta) > 0.5) viewport.scrollTop += delta;
}
