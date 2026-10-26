import type { QuireTextFragment } from "@quirekit/layout/text";

/**
 * Moves cached textblock fragments to the block's current position and id.
 *
 * Shaping depends on neither, but fragments carry absolute document positions
 * (range and caret stops) and ids prefixed by the block id, which is
 * path-based and changes when a sibling is inserted or removed before it.
 *
 * @param fragments - Cached fragments shaped at an earlier content start and id.
 * @param delta - Current content start minus the cached one.
 * @param fromId - Block id embedded in the cached fragment ids.
 * @param toId - Current block id.
 * @returns Rebased fragments, the input when nothing moved, or undefined when an
 * id does not carry the cached block id.
 */
export function rebaseCanvasBlockFragments(
  fragments: readonly QuireTextFragment[],
  delta: number,
  fromId: string | undefined,
  toId: string | undefined
): readonly QuireTextFragment[] | undefined {
  const prefix = fromId === undefined || toId === undefined || fromId === toId ? undefined : `${fromId}:`;
  if (delta === 0 && prefix === undefined) return fragments;
  if (prefix !== undefined && !fragments.every((fragment) => fragment.id.startsWith(prefix))) return undefined;

  return fragments.map((fragment) => ({
    ...fragment,
    ...(prefix === undefined ? {} : { id: `${toId}:${fragment.id.slice(prefix.length)}` }),
    range: { from: fragment.range.from + delta, to: fragment.range.to + delta },
    caretStops: fragment.caretStops.map((stop) => ({
      ...stop,
      position: { ...stop.position, pos: stop.position.pos + delta }
    }))
  }));
}
