import type { EditorState as PMEditorState, MarkType, NodeType } from "@quirekit/pm";
import { getMarkAttributes } from "./getMarkAttributes";
import { getNodeAttributes } from "./getNodeAttributes";
import { getSchemaTypeNameByName } from "./getSchemaTypeNameByName";

/**
 * Reads active node or mark attributes from the current selection.
 *
 * @param state - Current ProseMirror state.
 * @param typeOrName - Node/mark type or schema name.
 * @returns Active attributes, or an empty object.
 */
export function getAttributes(
  state: PMEditorState,
  typeOrName: string | NodeType | MarkType
): Record<string, unknown> {
  const name = typeof typeOrName === "string" ? typeOrName : typeOrName.name;
  const schemaType = getSchemaTypeNameByName(name, state.schema);

  if (schemaType === "node") {
    return getNodeAttributes(state, typeOrName as string | NodeType);
  }

  if (schemaType === "mark") {
    return getMarkAttributes(state, typeOrName as string | MarkType);
  }

  return {};
}
