import type { QuireTextFragment } from "@quirekit/layout/text";

/** One visual text line derived from text fragments. */
export interface QuireTextLineGroup {
  /** Explicit source-owned page or column break terminating this line. */
  readonly breakAfter?: "page" | "column" | undefined;
  /** Document position at the start of the line. */
  readonly from: number;
  /** Document position at the end of the line. */
  readonly to: number;
  /** Top coordinate in infinite-flow view space. */
  readonly top: number;
  /** Bottom coordinate in infinite-flow view space. */
  readonly bottom: number;
}

/**
 * Groups text fragments into visual lines by their line-box y coordinates.
 *
 * @param fragments - Text fragments owned by one layout box.
 * @returns Visual line groups in top-to-bottom order.
 */
export function groupQuireTextFragmentsIntoLines(
  fragments: readonly QuireTextFragment[]
): readonly QuireTextLineGroup[] {
  const sorted = areTextFragmentsInVisualOrder(fragments)
    ? fragments
    : [...fragments].sort(compareTextFragmentsByVisualOrder);
  const lines: QuireTextLineGroup[] = [];

  for (const fragment of sorted) {
    const previous = lines[lines.length - 1];

    if (previous !== undefined && isSameVisualLine(previous, fragment)) {
      lines[lines.length - 1] = appendFragmentToLine(previous, fragment);
    } else {
      lines.push(createTextLineGroup(fragment));
    }
  }

  return lines;
}

/**
 * Reports whether fragments already match the paginator's visual order.
 *
 * @param fragments - Text fragments to inspect.
 * @returns Whether fragments are ordered by line top and then x coordinate.
 */
function areTextFragmentsInVisualOrder(
  fragments: readonly QuireTextFragment[]
): boolean {
  for (let index = 1; index < fragments.length; index += 1) {
    const previous = fragments[index - 1];
    const current = fragments[index];

    if (
      previous !== undefined &&
      current !== undefined &&
      compareTextFragmentsByVisualOrder(previous, current) > 0
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Compares text fragments by the visual order used for line grouping.
 *
 * @param a - First text fragment.
 * @param b - Second text fragment.
 * @returns Negative when `a` should sort before `b`, positive when after.
 */
function compareTextFragmentsByVisualOrder(
  a: QuireTextFragment,
  b: QuireTextFragment
): number {
  return a.rect.y === b.rect.y ? a.rect.x - b.rect.x : a.rect.y - b.rect.y;
}

/** Tolerance absorbing floating-point drift between adjacent line boxes. */
const lineEdgeTolerance = 0.5;

/**
 * Checks whether a fragment belongs to an existing visual line group.
 *
 * Fragments on one line can start at different tops: a list marker shares the
 * body baseline but keeps its own glyph box. A following line starts at the
 * previous line's bottom, so only a real vertical overlap joins the line.
 *
 * @param line - Existing line group.
 * @param fragment - Candidate text fragment.
 * @returns True when the fragment shares the line top or overlaps the line box.
 */
function isSameVisualLine(
  line: QuireTextLineGroup,
  fragment: QuireTextFragment
): boolean {
  const top = fragment.rect.y;
  return Math.abs(top - line.top) <= lineEdgeTolerance
    || (top < line.bottom - lineEdgeTolerance && top + fragment.lineHeight > line.top + lineEdgeTolerance);
}

/**
 * Creates a line group from the first fragment on the line.
 *
 * @param fragment - First text fragment on a visual line.
 * @returns Initial line group.
 */
function createTextLineGroup(fragment: QuireTextFragment): QuireTextLineGroup {
  return {
    ...(fragment.breakAfter === undefined ? {} : { breakAfter: fragment.breakAfter }),
    from: fragment.range.from,
    to: fragment.range.to,
    top: fragment.rect.y,
    bottom: fragment.rect.y + fragment.lineHeight
  };
}

/**
 * Appends a text fragment to a visual line group.
 *
 * @param line - Existing line group.
 * @param fragment - Text fragment to append.
 * @returns Updated line group.
 */
function appendFragmentToLine(
  line: QuireTextLineGroup,
  fragment: QuireTextFragment
): QuireTextLineGroup {
  return {
    ...((line.breakAfter ?? fragment.breakAfter) === undefined ? {} : { breakAfter: line.breakAfter ?? fragment.breakAfter }),
    from: Math.min(line.from, fragment.range.from),
    to: Math.max(line.to, fragment.range.to),
    top: Math.min(line.top, fragment.rect.y),
    bottom: Math.max(line.bottom, fragment.rect.y + fragment.lineHeight)
  };
}
