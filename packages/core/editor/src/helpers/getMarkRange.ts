import type { Mark, MarkType, ResolvedPos } from "@quirekit/pm";
import type { QuireRange } from "../types";
import { objectIncludes } from "../utilities/objectIncludes";

/**
 * Finds a mark with matching type and attributes in a mark set.
 *
 * @param marks - Marks to inspect.
 * @param type - Mark type to match.
 * @param attributes - Attribute subset that must match.
 * @returns Matching mark, or undefined when none matches.
 */
function findMarkInSet(
  marks: readonly Mark[],
  type: MarkType,
  attributes: Readonly<Record<string, unknown>> = {}
): Mark | undefined {
  return marks.find((mark) => (
    mark.type === type &&
    objectIncludes(
      Object.fromEntries(Object.keys(attributes).map((key) => [key, mark.attrs[key]])),
      attributes
    )
  ));
}

/**
 * Checks whether a mark set contains a matching mark.
 *
 * @param marks - Marks to inspect.
 * @param type - Mark type to match.
 * @param attributes - Attribute subset that must match.
 * @returns Whether the mark set contains a matching mark.
 */
function isMarkInSet(
  marks: readonly Mark[],
  type: MarkType,
  attributes: Readonly<Record<string, unknown>> = {}
): boolean {
  return findMarkInSet(marks, type, attributes) !== undefined;
}

/**
 * Gets the contiguous range of a mark at a resolved position.
 *
 * @param $pos - Resolved document position to inspect.
 * @param type - Mark type to find.
 * @param attributes - Optional mark attributes to match.
 * @returns Mark range, or undefined when the position is not inside the mark.
 */
export function getMarkRange(
  $pos: ResolvedPos,
  type: MarkType,
  attributes?: Readonly<Record<string, unknown>>
): QuireRange | undefined {
  let start = $pos.parent.childAfter($pos.parentOffset);

  if (!start.node || !start.node.marks.some((mark) => mark.type === type)) {
    start = $pos.parent.childBefore($pos.parentOffset);
  }

  if (!start.node || !start.node.marks.some((mark) => mark.type === type)) {
    return undefined;
  }

  const matchAttributes = attributes ?? start.node.marks[0]?.attrs ?? {};
  const mark = findMarkInSet(start.node.marks, type, matchAttributes);

  if (!mark) {
    return undefined;
  }

  let startIndex = start.index;
  let startPos = $pos.start() + start.offset;
  let endIndex = startIndex + 1;
  let endPos = startPos + start.node.nodeSize;

  while (
    startIndex > 0 &&
    isMarkInSet($pos.parent.child(startIndex - 1).marks, type, matchAttributes)
  ) {
    startIndex -= 1;
    startPos -= $pos.parent.child(startIndex).nodeSize;
  }

  while (
    endIndex < $pos.parent.childCount &&
    isMarkInSet($pos.parent.child(endIndex).marks, type, matchAttributes)
  ) {
    endPos += $pos.parent.child(endIndex).nodeSize;
    endIndex += 1;
  }

  return { from: startPos, to: endPos };
}
