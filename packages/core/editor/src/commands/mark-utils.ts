import {
  TextSelection,
  type EditorState as PMEditorState,
  type MarkType,
  type Transaction
} from "@quirekit/pm";
import type {
  QuireAttributeTypeInput,
  QuireMarkTypeInput
} from "./mark-types";

/**
 * Resolves a mark type from a command state.
 *
 * @param state - Current ProseMirror editor state.
 * @param typeOrName - Mark type object or schema mark name.
 * @returns Matching mark type, or null when the schema does not contain it.
 */
export function resolveMarkType(
  state: PMEditorState,
  typeOrName: QuireMarkTypeInput
): MarkType | null {
  return typeof typeOrName === "string" ? state.schema.marks[typeOrName] ?? null : typeOrName;
}

/**
 * Checks whether the current selection can accept a mark type.
 *
 * @param state - Current ProseMirror state.
 * @param transaction - Transaction carrying the current selection.
 * @param markType - Mark type to inspect.
 * @returns Whether at least one selected inline position accepts the mark.
 */
export function canSetMark(
  state: PMEditorState,
  transaction: Transaction,
  markType: MarkType
): boolean {
  const { selection } = transaction;

  if (selection instanceof TextSelection && selection.$cursor) {
    const currentMarks = state.storedMarks ?? selection.$cursor.marks();
    const parentAllowsMarkType = selection.$cursor.parent.type.allowsMarkType(markType);

    return (
      parentAllowsMarkType &&
      (
        Boolean(markType.isInSet(currentMarks)) ||
        !currentMarks.some((mark) => mark.type.excludes(markType))
      )
    );
  }

  return selection.ranges.some(({ $from, $to }) => {
    let someNodeSupportsMark =
      $from.depth === 0
        ? transaction.doc.inlineContent
          && transaction.doc.type.allowsMarkType(markType)
        : false;

    transaction.doc.nodesBetween($from.pos, $to.pos, (node, _pos, parent) => {
      if (someNodeSupportsMark) {
        return false;
      }

      if (node.isInline) {
        const parentAllowsMarkType = !parent || parent.type.allowsMarkType(markType);
        const currentMarksAllowMarkType =
          Boolean(markType.isInSet(node.marks)) ||
          !node.marks.some((mark) => mark.type.excludes(markType));

        someNodeSupportsMark = parentAllowsMarkType && currentMarksAllowMarkType;
      }

      return !someNodeSupportsMark;
    });

    return someNodeSupportsMark;
  });
}

/**
 * Resolves the schema type name from a string or schema type object.
 *
 * @param typeOrName - Type object or schema type name.
 * @returns Schema type name.
 */
export function resolveSchemaTypeName(typeOrName: QuireAttributeTypeInput): string {
  return typeof typeOrName === "string" ? typeOrName : typeOrName.name;
}
