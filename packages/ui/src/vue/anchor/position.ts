import type { AnchorPosition } from './types';

/** @param value - Requested physical offset. @returns A finite, nonnegative pixel distance. */
export function normalizeAnchorOffset(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 16;
}
/** @param hash - Location fragment. @returns The decoded element ID, tolerating raw percent characters. */
export function decodeAnchorHash(hash: string): string {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  try { return decodeURIComponent(value); } catch { return value; }
}
/**
 * Resolves the heading whose content owns the current reading position.
 * @param targets - Visible headings in the scroll owner's coordinate system.
 * @param offset - Navigation and reading threshold.
 * @param atEnd - Whether a scrollable viewport has reached its bottom.
 * @returns The current heading ID, or an empty string when none are available.
 */
export function activeAnchor(targets: readonly AnchorPosition[], offset: number, atEnd: boolean): string {
  const ordered = [...targets].sort((a, b) => a.top - b.top);
  if (atEnd) return ordered.at(-1)?.id ?? '';
  let current = ordered[0]?.id ?? '';
  for (const target of ordered) {
    if (target.top > offset + 1) break;
    current = target.id;
  }
  return current;
}
