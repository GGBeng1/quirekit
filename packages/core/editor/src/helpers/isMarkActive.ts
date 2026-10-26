import type { EditorState as PMEditorState, Mark, MarkType } from "@quirekit/pm";
import { objectIncludes } from "../utilities/objectIncludes";
import { getMarkType } from "./getMarkType";

/** Active mark range used for mark active checks. */
interface MarkActiveRange {
  /** Mark in the checked range. */
  readonly mark: Mark;
  /** Inclusive range start. */
  readonly from: number;
  /** Exclusive range end. */
  readonly to: number;
}

/**
 * Reports whether a mark is active at the current selection.
 *
 * @param state - Current ProseMirror state.
 * @param typeOrName - Mark type, mark name, or null for any mark.
 * @param attributes - Attribute subset to match.
 * @returns Whether a matching mark is active.
 */
export function isMarkActive(
  state: PMEditorState,
  typeOrName: MarkType | string | null,
  attributes: Record<string, unknown> = {}
): boolean {
  const { empty, ranges } = state.selection;
  const type = typeOrName ? getMarkType(typeOrName, state.schema) : null;

  if (empty) {
    return Boolean(
      (state.storedMarks ?? state.selection.$from.marks())
        .filter((mark) => !type || mark.type.name === type.name)
        .find((mark) => objectIncludes(mark.attrs, attributes, { strict: false }))
    );
  }

  let selectionRange = 0;
  const markRanges: MarkActiveRange[] = [];

  for (const { $from, $to } of ranges) {
    const from = $from.pos;
    const to = $to.pos;

    state.doc.nodesBetween(from, to, (node, pos) => {
      if (type && node.inlineContent && !node.type.allowsMarkType(type)) {
        return false;
      }

      if (!node.isText && node.marks.length === 0) {
        return undefined;
      }

      const relativeFrom = Math.max(from, pos);
      const relativeTo = Math.min(to, pos + node.nodeSize);
      selectionRange += relativeTo - relativeFrom;
      markRanges.push(
        ...node.marks.map((mark) => ({
          mark,
          from: relativeFrom,
          to: relativeTo
        }))
      );

      return undefined;
    });
  }

  if (selectionRange === 0) {
    return false;
  }

  const matchedRange = markRanges
    .filter((range) => !type || range.mark.type.name === type.name)
    .filter((range) => objectIncludes(range.mark.attrs, attributes, { strict: false }))
    .reduce((sum, range) => sum + range.to - range.from, 0);

  return matchedRange >= selectionRange;
}
