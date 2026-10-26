import type { QuireTextFragment } from "@quirekit/layout/text";

/** @param fragments - Source-ordered LTR fragments. @param index - Fragment on the row. @returns First fragment on the same physical row. */
export function fragmentRowStart(fragments: readonly QuireTextFragment[], index: number): number {
  while (index > 0 && fragments[index - 1]!.rect.y === fragments[index]?.rect.y) index--;
  return index;
}

/** @param fragments - Source-ordered LTR fragments. @param index - Fragment on the row. @returns Exclusive end of its physical row. */
export function fragmentRowEnd(fragments: readonly QuireTextFragment[], index: number): number {
  const y = fragments[index]?.rect.y;
  while (index < fragments.length && fragments[index]!.rect.y === y) index++;
  return index;
}

/**
 * Requires a whole retained row to match, never just one automatically spaced fragment.
 * @param previous - Retained fragments.
 * @param previousIndex - Candidate row start.
 * @param current - Newly shaped probe fragments.
 * @param currentIndex - Matching source position in the probe.
 * @param matches - Existing fragment geometry, source and style comparator.
 * @returns Whether both candidates start equal complete rows.
 */
export function fragmentRowsMatch(
  previous: readonly QuireTextFragment[], previousIndex: number,
  current: readonly QuireTextFragment[], currentIndex: number,
  matches: (left: QuireTextFragment, right: QuireTextFragment) => boolean
): boolean {
  if (fragmentRowStart(previous, previousIndex) !== previousIndex || fragmentRowStart(current, currentIndex) !== currentIndex) return false;
  const count = fragmentRowEnd(previous, previousIndex) - previousIndex;
  if (count !== fragmentRowEnd(current, currentIndex) - currentIndex) return false;
  for (let offset = 0; offset < count; offset++) {
    if (!matches(previous[previousIndex + offset]!, current[currentIndex + offset]!)) return false;
  }
  return count > 0;
}
