/** One heading start position paired with its outline node id, sorted by position. */
export interface ClassicEditorOutlineAnchor {
  /** Outline node id. */
  readonly id: string;
  /** Document position where the heading node starts. */
  readonly position: number;
}

/**
 * Orders outline positions once per projection so scroll tracking only binary-searches.
 * @param positions - Outline node id to heading start position.
 * @returns Anchors sorted by document position.
 */
export function sortOutlineAnchors(positions: ReadonlyMap<string, number>): readonly ClassicEditorOutlineAnchor[] {
  return [...positions].map(([id, position]) => ({ id, position })).sort((left, right) => left.position - right.position);
}

/**
 * Finds the last heading whose top has reached the reading line, by binary search over vertical position.
 * Heading tops grow with document position, so only O(log n) geometry queries run per call.
 * @param anchors - Anchors sorted by position.
 * @param topOf - Viewport top of a heading start position.
 * @param readingLine - Viewport y of the reading line.
 * @returns Heading id, or the first heading while every heading is still below the line.
 */
export function findHeadingAtReadingLine(
  anchors: readonly ClassicEditorOutlineAnchor[],
  topOf: (position: number) => number,
  readingLine: number
): string | undefined {
  let low = 0;
  let high = anchors.length - 1;
  let found = anchors[0]?.id;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const anchor = anchors[middle]!;
    if (topOf(anchor.position) <= readingLine) {
      found = anchor.id;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}
