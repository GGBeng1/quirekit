import type { EditorState as PMEditorState } from "@quirekit/pm";
import { getSchemaTypeNameByName } from "./getSchemaTypeNameByName";
import { isMarkActive } from "./isMarkActive";
import { isNodeActive } from "./isNodeActive";

/**
 * Reports whether a node or mark is active at the current selection.
 *
 * @param state - Current ProseMirror state.
 * @param name - Schema item name, or null to match any node or mark.
 * @param attributes - Attribute subset to match.
 * @returns Whether a matching node or mark is active.
 */
export function isActive(
  state: PMEditorState,
  name: string | null,
  attributes: Record<string, unknown> = {}
): boolean {
  if (!name) {
    return isNodeActive(state, null, attributes) || isMarkActive(state, null, attributes);
  }

  const schemaType = getSchemaTypeNameByName(name, state.schema);

  if (schemaType === "node") {
    return isNodeActive(state, name, attributes);
  }

  if (schemaType === "mark") {
    return isMarkActive(state, name, attributes);
  }

  return false;
}
