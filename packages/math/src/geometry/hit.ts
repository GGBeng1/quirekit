import type { MathCaret, MathVisualSelection } from '../visual/types';
import type { MathSurfaceSlot } from './types';

/**
 * Resolves a point to the deepest slot then its nearest character boundary.
 * @param geometry - Retained layout snapshot.
 * @param left - Content horizontal coordinate.
 * @param top - Content vertical coordinate.
 * @returns Internal structural caret.
 */
export function hitMathGeometry(geometry: readonly MathSurfaceSlot[], left: number, top: number): MathCaret {
  /**
   * Measures how far the point lies outside a slot box.
   * @param slot - Candidate slot.
   * @returns Euclidean distance, zero inside the box.
   */
  function distance(slot: MathSurfaceSlot): number {
    const { rect } = slot;
    const dx = Math.max(rect.left - left, 0, left - rect.left - rect.width);
    const dy = Math.max(rect.top - top, 0, top - rect.top - rect.height);
    return Math.hypot(dx, dy);
  }
  // A 3px tolerance makes thin slots reachable; among equally deep candidates the nearest wins.
  const containing = geometry.filter(slot => distance(slot) <= 3);
  const depth = (slot: MathSurfaceSlot) => slot.id.split('/').length;
  const slot = containing.sort((a, b) => depth(b) - depth(a) || distance(a) - distance(b))[0] ?? geometry[0];
  if (!slot) return { slot: 'root', index: 0 };
  let index = 0;
  let nearest = Infinity;
  slot.boundaries.forEach((boundary, candidate) => {
    const current = Math.abs(left - boundary);
    if (current < nearest) {
      nearest = current;
      index = candidate;
    }
  });
  return { slot: slot.id, index };
}
/**
 * Promotes cross-slot endpoints to whole children of their nearest common slot.
 * @param geometry - Retained slot ownership.
 * @param anchor - Original pointer-down caret.
 * @param focus - Latest pointer caret.
 * @returns Syntax-safe selection without partial structures.
 */
export function selectMathGeometry(geometry: readonly MathSurfaceSlot[], anchor: MathCaret, focus: MathCaret): MathVisualSelection {
  if (anchor.slot === focus.slot) return { anchor, focus };
  const slots = new Map(geometry.map(slot => [slot.id, slot]));
  /**
   * Walks enclosing children from an endpoint to the root.
   * @param caret - Nested endpoint.
   * @returns Inner-to-outer ownership path.
   */
  function path(caret: MathCaret): MathCaret[] {
    const result = [caret]; let parent = slots.get(caret.slot)?.parent;
    while (parent) { result.push(parent); parent = slots.get(parent.slot)?.parent; }
    return result;
  }
  const origins = path(anchor); const ends = path(focus);
  for (const origin of origins) {
    const end = ends.find(item => item.slot === origin.slot);
    if (!end) continue;
    const low = Math.min(origin.index, end.index);
    const high = Math.max(origin.index + (origin.slot !== anchor.slot ? 1 : 0), end.index + (end.slot !== focus.slot ? 1 : 0));
    return { anchor: { slot: origin.slot, index: low }, focus: { slot: origin.slot, index: high } };
  }
  return { focus };
}
