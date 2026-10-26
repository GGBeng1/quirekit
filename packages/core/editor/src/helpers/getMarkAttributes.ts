import type { EditorState as PMEditorState, Mark, MarkType } from "@quirekit/pm";
import { getMarkType } from "./getMarkType";

/**
 * Reads active mark attributes from the current selection.
 *
 * @param state - Current ProseMirror state.
 * @param typeOrName - Mark type or name.
 * @returns Active mark attributes, or an empty object.
 */
export function getMarkAttributes(
  state: PMEditorState,
  typeOrName: string | MarkType
): Record<string, unknown> {
  const type = getMarkType(typeOrName, state.schema);
  const marks: Mark[] = [];

  if (state.selection.empty) {
    marks.push(...(state.storedMarks ?? state.selection.$head.marks()));
  } else {
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
      marks.push(...node.marks);
    });
  }

  return { ...(marks.find((mark) => mark.type.name === type.name)?.attrs ?? {}) };
}
